import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";
import test from "node:test";
import { setTimeout as sleep } from "node:timers/promises";
import { frontendHandler } from "../src/server/http";
import { replicaRecovery } from "../src/server/settings/recovery";

async function listen(server: Server) {
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

function close(server: Server) {
  server.closeAllConnections();
  return new Promise<void>((resolve) => server.close(() => resolve()));
}

async function until(predicate: () => boolean) {
  const deadline = Date.now() + 5000;
  while (!predicate()) {
    if (Date.now() > deadline) assert.fail("background check did not complete");
    await sleep(10);
  }
}

test("homepage requests wake recovery without waiting and periodic checks stay rate limited", async (t) => {
  const token = "fixture-secret-that-is-long-enough";
  const attempts: (string | undefined)[][] = [];
  let allowResponse: () => void = () => {};
  const responseGate = new Promise<void>(
    (resolve) => (allowResponse = resolve),
  );
  const backend = createServer(async (request, response) => {
    attempts.push([request.method, request.url, request.headers.authorization]);
    await responseGate;
    response.writeHead(200, { "Content-Type": "application/json" });
    response.end(
      JSON.stringify({
        success: true,
        code: 200,
        data: { node_id: "web-main", queued: attempts.length > 1 },
      }),
    );
  });
  const baseUrl = await listen(backend);
  let reads = 0;
  const recovery = replicaRecovery({
    intervalSeconds: 1,
    settings: {
      async read() {
        reads++;
        return null;
      },
      async apply() {
        assert.fail("recovery must use authenticated delivery");
      },
    },
    content: {
      maxBytes: 64,
      async read() {
        return null;
      },
      async apply() {
        assert.fail("recovery must use authenticated delivery");
      },
    },
    backend: () => ({ baseUrl, nodeId: "web-main", token, timeoutMs: 4000 }),
  });
  let visits = 0;
  const frontend = createServer(
    frontendHandler(
      (_request, response) => {
        response.end("web");
      },
      (_request, response) => {
        response.end("internal");
      },
      () => {
        visits++;
        recovery.visit();
      },
    ),
  );
  const frontUrl = await listen(frontend);
  t.after(async () => {
    recovery.stop();
    allowResponse();
    await Promise.all([close(frontend), close(backend)]);
  });
  recovery.start();
  const periodic = Date.parse(recovery.status().next_check_at!);
  assert.equal(recovery.status().last_checked_at, null);
  assert.equal(await (await fetch(frontUrl + "/")).text(), "web");
  await until(() => attempts.length === 1);
  assert.ok(Date.parse(recovery.status().last_checked_at!) < periodic);
  assert.deepEqual(attempts[0], [
    "POST",
    "/internal/frontend-nodes/web-main/recover",
    `Bearer ${token}`,
  ]);
  await Promise.all([
    fetch(frontUrl + "/_next/path", { headers: { Accept: "text/html" } }),
    fetch(frontUrl + "/admin/content", { headers: { Accept: "text/html" } }),
    fetch(frontUrl + "/internal/status"),
  ]);
  assert.equal(visits, 1);
  allowResponse();
  await until(() => recovery.status().state === "waiting");
  const first = recovery.status();
  assert.equal(first.interval_seconds, 1);
  assert.ok(Date.parse(first.last_checked_at!) <= Date.now());
  assert.ok(Date.parse(first.next_check_at!) > Date.now());

  await Promise.all(Array.from({ length: 8 }, () => fetch(frontUrl + "/")));
  assert.equal(attempts.length, 1);
  await until(() => recovery.status().state === "queued");
  assert.equal(attempts.length, 2);
  assert.equal(reads, 4);

  const next = Date.parse(recovery.status().next_check_at!);
  recovery.cleared();
  await until(() => attempts.length === 3);
  assert.ok(Date.parse(recovery.status().last_checked_at!) < next);
});
