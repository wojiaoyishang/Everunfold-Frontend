import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import test from "node:test";

test("ESM inventory process reads imported YAML credentials and reloads saved tokens", async () => {
  const root = await mkdtemp(
    path.join(tmpdir(), "everunfold-inventory-runtime-"),
  );
  const received: string[] = [];
  const origins: string[] = [];
  const server = createServer((request, response) => {
    received.push(request.headers.authorization ?? "");
    origins.push(
      String(request.headers["x-everunfold-public-url"] ?? "missing"),
    );
    request.resume();
    response.setHeader("Content-Type", "application/json");
    response.end(
      JSON.stringify({
        success: true,
        code: 200,
        data: { node_id: "web-main", registered: true },
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const filename = path.join(root, "imported.yaml");
  const token = "synthetic-imported-token-".repeat(3);
  const save = async (value: string) =>
    writeFile(
      filename,
      JSON.stringify({
        version: 1,
        component: "frontend",
        application: {
          BACKEND_BASE_URL: "https://api.example.test",
          FRONTEND_NODE_ID: "web-main",
          PUBLIC_SITE_URL: "https://frontend.example.test",
          backend: {
            base_url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
            nextjs_to_fastapi_token_env: "INVENTORY_RUNTIME_TOKEN",
          },
        },
        environment: { INVENTORY_RUNTIME_TOKEN: value },
      }),
    );
  await mkdir(path.join(root, "var/cache/build"), { recursive: true });
  await writeFile(path.join(root, "var/cache/build/theme-catalog.json"), "[]");
  await save(token);
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    CONFIG_FILE: filename,
  };
  delete environment.INVENTORY_RUNTIME_TOKEN;
  const child = spawn(
    process.execPath,
    ["--import", "tsx", "tests/fixtures/inventory.mts", root],
    {
      cwd: process.cwd(),
      env: environment,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  let logs = "";
  child.stdout.on("data", (chunk) => {
    logs += String(chunk);
  });
  child.stderr.on("data", (chunk) => {
    logs += String(chunk);
  });
  const until = async (predicate: () => boolean) => {
    const deadline = Date.now() + 7000;
    while (!predicate() && Date.now() < deadline && child.exitCode === null)
      await delay(25);
    assert.ok(predicate(), logs);
  };
  try {
    await until(() => received.length > 0);
    assert.equal(received[0], "Bearer " + token);
    assert.equal(origins[0], "https://frontend.example.test");
    await save(token + "rotated");
    await until(() => received.includes("Bearer " + token + "rotated"));
    assert.ok(!logs.includes(token));
  } finally {
    child.kill("SIGTERM");
    if (child.exitCode === null) await once(child, "exit");
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
