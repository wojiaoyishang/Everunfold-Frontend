/** Run against a production build: node --import tsx tools/verify-frontend-workers.mts */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { stringify } from "yaml";
import { snapshot } from "../tests/fixtures";

const root = fileURLToPath(new URL("..", import.meta.url));
const data = await mkdtemp(path.join(tmpdir(), "everunfold-web-workers-"));
const config = path.join(data, "config.yaml");
const node = "test-workers";
const epoch = randomUUID();
const inbound = randomUUID();
const outbound = randomUUID();
const identity = { node_id: node, source_epoch: epoch };
const backend = createServer((request, response) => {
  request.resume();
  const inventory = request.url?.startsWith("/internal/extensions/");
  if (request.headers.authorization !== `Bearer ${outbound}`) {
    response.writeHead(403).end();
    return;
  }
  if (inventory) reports++;
  else recoveries++;
  response.writeHead(200, { "Content-Type": "application/json" }).end(
    JSON.stringify({
      success: true,
      code: 200,
      data: {
        node_id: node,
        ...(inventory ? { registered: true } : { queued: true }),
      },
    }),
  );
});
let reports = 0;
let recoveries = 0;
let logs = "";
let frontend: ReturnType<typeof spawn> | undefined;
const headers = { Authorization: `Bearer ${inbound}` };

function start(workers?: string) {
  logs = "";
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "tools/plugins/run.mts", "start"],
    {
      cwd: root,
      env: {
        PATH: process.env.PATH,
        CONFIG_FILE: config,
        NEXT_TELEMETRY_DISABLED: "1",
        ...(workers ? { FRONTEND_WORKERS: workers } : {}),
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  child.stdout?.on("data", (part) => (logs += part.toString()));
  child.stderr?.on("data", (part) => (logs += part.toString()));
  frontend = child;
  return { child, exited: once(child, "exit") };
}

function readyServers() {
  return new Set(
    [...logs.matchAll(/Frontend ready: .*pid (\d+)/g)].map((match) => match[1]),
  ).size;
}

async function waitFor(test: () => boolean) {
  const deadline = Date.now() + 15000;
  while (!test()) {
    if (
      Date.now() >= deadline ||
      frontend?.exitCode != null ||
      frontend?.signalCode
    )
      throw new Error("Production frontend did not become ready");
    await sleep(50);
  }
}

try {
  backend.listen(0, "127.0.0.1");
  await once(backend, "listening");
  const base = `http://127.0.0.1:${(backend.address() as AddressInfo).port}`;
  const probe = createServer().listen(0, "127.0.0.1");
  await once(probe, "listening");
  const port = (probe.address() as AddressInfo).port;
  await new Promise<void>((resolve) => probe.close(() => resolve()));
  await writeFile(
    config,
    stringify({
      version: 1,
      component: "frontend",
      environment: {
        FRONTEND_PORT: String(port),
        FRONTEND_HOST: "127.0.0.1",
        FRONTEND_WORKERS: "2",
        EVERUNFOLD_DATA_DIR: data,
        NODE_IN: inbound,
        NODE_OUT: outbound,
      },
      application: {
        BACKEND_BASE_URL: base,
        FRONTEND_NODE_ID: node,
        backend: {
          allowed_peer_ips: ["127.0.0.1"],
          fastapi_to_nextjs_token_env: "NODE_IN",
          nextjs_to_fastapi_token_env: "NODE_OUT",
        },
        settings: { source_epoch: epoch },
      },
    }),
  );
  const multiple = start();
  await waitFor(() => readyServers() === 2 && reports === 1);
  const origin = `http://127.0.0.1:${port}`;
  const internal = "/internal/cache/v1";
  const request = (route: string, init?: RequestInit) =>
    fetch(origin + route, { ...init, signal: AbortSignal.timeout(5000) });
  const post = (route: string, body: unknown) =>
    request(internal + route, {
      method: "POST",
      headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  assert.equal((await request(internal + "/status")).status, 403);
  const checks = await Promise.all(
    Array.from({ length: 6 }, async () => {
      const response = await request(internal + "/status", { headers });
      assert.equal(response.status, 200);
      return (await response.json()).sync_check.next_check_at;
    }),
  );
  assert.ok(checks[0]);
  assert.equal(
    new Set(checks).size,
    1,
    "every worker sees the same recovery schedule",
  );
  const apply = (revision: number) =>
    post("/apply", {
      protocol: "content-1",
      ...identity,
      resource: "public-content",
      revision,
      value: { ...snapshot(), source_epoch: epoch, generation: revision },
    });
  for (const response of await Promise.all([apply(2), apply(1)]))
    assert.equal(response.status, 200);
  for (const response of await Promise.all(
    Array.from({ length: 6 }, () => request("/health/ready")),
  ))
    assert.equal(
      response.status,
      200,
      "all readers see the committed snapshot",
    );
  assert.equal((await post("/clear", identity)).status, 200);
  await waitFor(() => recoveries === 1);
  assert.equal((await apply(1)).status, 200);
  assert.equal(
    (await request("/health/ready")).status,
    503,
    "old revision cannot return after clear",
  );
  assert.equal((await apply(2)).status, 200);
  assert.equal((await request("/health/ready")).status, 200);
  assert.equal(reports, 1, "the inventory reporter is a singleton");
  assert.equal(recoveries, 1, "the recovery check is a singleton");
  multiple.child.kill("SIGTERM");
  assert.deepEqual(await multiple.exited, [0, null]);
  const single = start("1");
  await waitFor(() => readyServers() === 1 && reports === 2);
  assert.equal((await request("/health/ready")).status, 200);
  assert.equal((await request(internal + "/status", { headers })).status, 200);
  single.child.kill("SIGTERM");
  assert.deepEqual(await single.exited, [0, null]);
  console.log(
    "Two production web workers share one port, one recovery schedule and one replica store. The same build restarts with one worker.",
  );
} catch (error) {
  if (logs) console.error(logs);
  throw error;
} finally {
  if (
    frontend?.pid &&
    frontend.exitCode === null &&
    frontend.signalCode === null
  ) {
    const exited = once(frontend, "exit");
    frontend.kill("SIGTERM");
    await exited;
  }
  backend.closeAllConnections();
  await new Promise<void>((resolve) => backend.close(() => resolve()));
  await rm(data, { recursive: true, force: true });
}
