import assert from "node:assert/strict";
import test from "node:test";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { once } from "node:events";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { FileSettingsStore } from "../src/server/settings/store";
import { settingsReceiver } from "../src/server/settings/receiver";
import { syncErrorDetails, syncTarget } from "../src/server/sync-diagnostics";
import { watchInventory } from "../tools/plugins/inventory.mjs";

const epoch = "00000000-0000-0000-0000-000000000001";
const token = "synthetic-private-token-".repeat(3);
const delivery = {
  protocol: "settings-1",
  node_id: "test",
  source_epoch: epoch,
  resource: "cache-policy",
  revision: 1,
  value: {
    dynamic_freshness_seconds: 30,
    request_timeout_seconds: 8,
    batch_delay_ms: 24,
    retry_delay_ms: 1500,
  },
};

test("receiver logs precise auth, identity, JSON and disk failures without exposing data", async (t) => {
  const logs: string[] = [];
  t.mock.method(console, "error", (line: string) => logs.push(line));
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-sync-log-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const store = new FileSettingsStore(root, "test", epoch);
  for (const peers of [["127.0.0.2"], ["127.0.0.1"]]) {
    const server = settingsReceiver(store, token, peers, undefined, {
      node_id: "test",
      source_epoch: epoch,
    });
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/internal/settings/apply`;
      const post = async (body: string, bearer: string | null = token) => {
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(bearer === null ? {} : { Authorization: `Bearer ${bearer}` }),
            "X-Forwarded-For": "127.0.0.1",
          },
          body,
        });
        await response.text();
        return response.status;
      };
      if (peers[0] !== "127.0.0.1") {
        assert.equal(await post(JSON.stringify(delivery)), 403);
        assert.match(logs.at(-1)!, /peer_not_allowed/);
        continue;
      }
      assert.equal(await post("{}", null), 403);
      assert.match(logs.at(-1)!, /token_missing/);
      assert.equal(await post("{}", "wrong-private-token"), 403);
      assert.match(logs.at(-1)!, /token_mismatch/);
      assert.equal(
        await post(JSON.stringify({ ...delivery, node_id: "wrong" })),
        409,
      );
      assert.match(logs.at(-1)!, /node_mismatch/);
      assert.equal(
        await post(
          JSON.stringify({
            ...delivery,
            source_epoch: "00000000-0000-0000-0000-000000000002",
          }),
        ),
        409,
      );
      assert.match(logs.at(-1)!, /source_epoch_mismatch/);
      assert.equal(await post('{"secret":"DO_NOT_LOG"'), 409);
      assert.match(logs.at(-1)!, /SyntaxError/);
      const count = logs.length;
      assert.equal(await post(JSON.stringify(delivery)), 200);
      assert.equal(logs.length, count);
      t.mock.method(store, "apply", async () => {
        throw Object.assign(new Error("DO_NOT_LOG"), {
          code: "EACCES",
          path: "/data/DO_NOT_LOG",
        });
      });
      assert.equal(await post(JSON.stringify(delivery)), 409);
      assert.match(logs.at(-1)!, /EACCES/);
      assert.match(logs.at(-1)!, /UID\/GID/);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
  const text = logs.join("\n");
  assert.match(text, /POST \/internal\/settings\/apply/);
  assert.match(text, /"peer":"127.0.0.1"/);
  assert.match(text, /"node_id":"test"/);
  for (const secret of [
    token,
    "wrong-private-token",
    "DO_NOT_LOG",
    "dynamic_freshness_seconds",
  ])
    assert.ok(!text.includes(secret));
});

test("network diagnostics follow nested causes and remove URL secrets", () => {
  for (const code of [
    "ENOTFOUND",
    "ECONNREFUSED",
    "ETIMEDOUT",
    "CERT_HAS_EXPIRED",
    "ENOSPC",
    "EROFS",
  ]) {
    const error = new Error("private URL or token", {
      cause: new AggregateError([
        Object.assign(new Error("private detail"), { code }),
      ]),
    });
    const detail = syncErrorDetails(error);
    assert.equal(detail.error_code, code);
    assert.ok(!JSON.stringify(detail).includes("private"));
  }
  assert.equal(
    syncTarget(
      "https://user:private@example.test/internal/check?token=private#private",
    ),
    "https://example.test/internal/check",
  );
  assert.ok(
    !JSON.stringify(syncErrorDetails(new Error("private detail"))).includes(
      "private detail",
    ),
  );
});

test("inventory reporting logs HTTP rejection, refuses false acknowledgments and logs recovery", async (t) => {
  const errors: string[] = [],
    info: string[] = [];
  t.mock.method(console, "error", (line: string) => errors.push(line));
  t.mock.method(console, "info", (line: string) => info.push(line));
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-inventory-log-"));
  let phase = 0;
  const server = createServer((request, response) => {
    request.resume();
    assert.equal(request.url, "/internal/extensions/test");
    assert.equal(request.headers.authorization, "Bearer " + token);
    response.setHeader("Content-Type", "application/json");
    response.statusCode = phase === 0 ? 403 : 200;
    response.end(
      JSON.stringify(
        phase === 0
          ? { success: false, code: 40320, msg: "DO_NOT_LOG" }
          : phase === 1
            ? {
                success: true,
                code: 200,
                data: { node_id: "other", registered: true },
              }
            : {
                success: true,
                code: 200,
                data: { node_id: "test", registered: true },
              },
      ),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  let stop = () => {};
  t.after(async () => {
    stop();
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  await mkdir(path.join(root, "var/cache/build"), { recursive: true });
  await writeFile(path.join(root, "var/cache/build/theme-catalog.json"), "[]");
  const config = path.join(root, "config.toml");
  await writeFile(
    config,
    `BACKEND_BASE_URL = "https://public.invalid"\nFRONTEND_NODE_ID = "test"\n[backend]\nbase_url = "${url}"\nnextjs_to_fastapi_token_env = "EVERUNFOLD_TEST_SYNC_TOKEN"\n`,
  );
  const oldConfig = process.env.CONFIG_FILE;
  const oldToken = process.env.EVERUNFOLD_TEST_SYNC_TOKEN;
  process.env.CONFIG_FILE = config;
  process.env.EVERUNFOLD_TEST_SYNC_TOKEN = token;
  t.after(() => {
    if (oldConfig === undefined) delete process.env.CONFIG_FILE;
    else process.env.CONFIG_FILE = oldConfig;
    if (oldToken === undefined) delete process.env.EVERUNFOLD_TEST_SYNC_TOKEN;
    else process.env.EVERUNFOLD_TEST_SYNC_TOKEN = oldToken;
  });
  const until = async (check: () => boolean) => {
    const deadline = Date.now() + 7000;
    while (!check() && Date.now() < deadline) await delay(25);
    assert.ok(check(), errors.join("\n"));
  };
  stop = watchInventory(root);
  await until(() =>
    errors.some((line) => line.includes("inventory_forbidden")),
  );
  assert.match(errors[0], /"status":403/);
  assert.ok(errors[0].includes(url + "/internal/extensions/test"));
  assert.match(errors[0], /节点已启用/);
  phase = 1;
  await until(() =>
    errors.some((line) => line.includes("inventory_invalid_response")),
  );
  assert.equal(info.length, 0);
  phase = 2;
  await until(() => info.some((line) => line.includes("inventory_registered")));
  assert.match(info[0], /已恢复/);
  assert.ok(!errors.join("\n").includes(token));
  assert.ok(!errors.join("\n").includes("DO_NOT_LOG"));
});
