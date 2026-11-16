import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { FileSettingsStore } from "../src/server/settings/store";
import {
  settingsHandler,
  settingsReceiver,
} from "../src/server/settings/receiver";
import { cacheMaintenance } from "../src/server/settings/cache-maintenance";
import {
  ClearedPublicContent,
  FileContentStore,
} from "../src/server/content/store";
import { snapshot } from "./fixtures";
import { createServer } from "node:http";
import { frontendHandler } from "../src/server/http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
const policy = (epoch: string, revision: number) => ({
  protocol: "settings-1",
  node_id: "test",
  source_epoch: epoch,
  resource: "cache-policy",
  revision,
  value: {
    dynamic_freshness_seconds: 30,
    request_timeout_seconds: 8,
    batch_delay_ms: 24,
    retry_delay_ms: 1500,
  },
});
const publicSettings = (epoch: string, revision: number) => ({
  protocol: "settings-1",
  node_id: "test",
  source_epoch: epoch,
  resource: "public-settings",
  revision,
  value: {
    site: { name: "Test", description: "", author: "Admin" },
    theme: {},
    translations: {
      public: { "zh-CN": { 工作台: "大香蕉" } },
      admin: { "zh-CN": { 工作台: "大香蕉" } },
      backend: {},
    },
  },
});

test("settings commit is monotonic, replay safe and rejects conflicting revisions/epochs", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "everunfold-settings-"),
  );
  const epoch = randomUUID();
  const first = new FileSettingsStore(directory, "test", epoch);
  assert.equal(await first.read("cache-policy"), null);
  await Promise.all([
    first.apply(policy(epoch, 5)),
    first.apply(policy(epoch, 2)),
    first.apply(policy(epoch, 5)),
  ]);
  assert.equal(
    (await new FileSettingsStore(directory, "test", epoch).read("cache-policy"))
      ?.revision,
    5,
  );
  await assert.rejects(
    first.apply({
      ...policy(epoch, 5),
      value: { ...policy(epoch, 5).value, request_timeout_seconds: 9 },
    }),
  );
  await assert.rejects(first.apply(policy(randomUUID(), 6)));
  await assert.rejects(
    first.apply({ ...policy(epoch, 6), value: { snapshot_ttl: 30 } }),
  );
  await assert.rejects(first.apply({ ...policy(epoch, 6), node_id: "other" }));
  // An interrupted staging write is invisible after restart.
  await writeFile(
    path.join(directory, "test", epoch, ".staging-crashed"),
    '{"broken":',
  );
  assert.equal((await first.read("cache-policy"))?.revision, 5);
  // A corrupt committed latest file must not roll back to a stale older value.
  await writeFile(
    path.join(directory, "test", epoch, "cache-policy.6.json"),
    "broken",
  );
  await assert.rejects(first.read("cache-policy"));
});

test("receiver requires actual socket IP AND token; forwarding headers do not grant access", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "everunfold-receiver-"),
  );
  const epoch = randomUUID();
  const store = new FileSettingsStore(directory, "test", epoch);
  const token = randomUUID() + randomUUID();
  for (const peers of [["127.0.0.2"], ["127.0.0.1"]]) {
    const server = createServer(
      frontendHandler(
        (_request, response) => {
          response.end("web");
        },
        settingsHandler(store, token, peers, undefined, {
          node_id: "test",
          source_epoch: epoch,
        }),
      ),
    );
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/internal/settings/apply`;
      const origin = new URL(url).origin;
      assert.equal(await (await fetch(origin)).text(), "web");
      assert.equal((await fetch(origin + "/internal/unknown")).status, 403);
      const headers = {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-Forwarded-For": "127.0.0.2",
      };
      const result = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(policy(epoch, 1)),
      });
      assert.equal(result.status, peers[0] === "127.0.0.1" ? 200 : 403);
      const statusUrl = url.replace(/\/apply$/, "/status");
      assert.equal(
        (
          await fetch(statusUrl, {
            headers: { "X-Forwarded-For": "127.0.0.1" },
          })
        ).status,
        403,
      );
      const probe = await fetch(statusUrl, { headers });
      assert.equal(probe.status, peers[0] === "127.0.0.1" ? 200 : 403);
      if (probe.ok) {
        assert.deepEqual(await probe.json(), {
          protocol: "node-status-1",
          node_id: "test",
          source_epoch: epoch,
          public_settings: { status: "missing", revision: null },
          cache_policy: { status: "ready", revision: 1 },
          public_content: { status: "missing", revision: null },
        });
      }
      assert.equal(
        (
          await fetch(url, {
            method: "POST",
            headers: { ...headers, Authorization: "Bearer wrong" },
            body: "{}",
          })
        ).status,
        403,
      );
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }
  assert.equal((await store.read("cache-policy"))?.revision, 1);
});

test("settings receiver accepts database-backed translation overrides", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "everunfold-settings-translations-"),
  );
  const epoch = randomUUID();
  const store = new FileSettingsStore(directory, "test", epoch);
  await store.apply(publicSettings(epoch, 3));
  const saved = await store.read("public-settings");
  assert.equal(saved?.revision, 3);
  assert.deepEqual((saved?.value as { translations: unknown }).translations, {
    public: { "zh-CN": { 工作台: "大香蕉" } },
    admin: { "zh-CN": { 工作台: "大香蕉" } },
    backend: {},
  });
});

test("clearing a bound node removes current replicas without replaying older releases", async (t) => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "everunfold-clear-"));
  const settingsDirectory = path.join(directory, "settings");
  const contentDirectory = path.join(directory, "content");
  const epoch = randomUUID();
  const token = randomUUID() + randomUUID();
  const identity = { node_id: "test", source_epoch: epoch };
  const settings = new FileSettingsStore(settingsDirectory, "test", epoch);
  const content = new FileContentStore(contentDirectory, "test", epoch);
  const old = {
    protocol: "content-1",
    ...identity,
    resource: "public-content",
    revision: 1,
    value: { ...snapshot(), source_epoch: epoch, generation: 1 },
  };
  const current = {
    ...old,
    revision: 2,
    value: { ...old.value, generation: 2, contents: [], comments: {} },
  };
  await content.apply(old);
  await content.apply(current);
  await writeFile(
    path.join(contentDirectory, "current.json"),
    JSON.stringify(old.value),
  );
  await writeFile(path.join(contentDirectory, "keep.json"), "unrelated");
  const otherEpoch = randomUUID();
  const unrelated = new FileSettingsStore(
    settingsDirectory,
    "test",
    otherEpoch,
  );
  await unrelated.apply(policy(otherEpoch, 1));
  for (const revision of [1, 2]) {
    await settings.apply(policy(epoch, revision));
    await settings.apply(publicSettings(epoch, revision));
  }
  const maintenance = cacheMaintenance(identity, settings, content);
  let clearChecks = 0;
  const check = {
    interval_seconds: 60,
    last_checked_at: null,
    next_check_at: null,
    state: "idle",
  } as const;
  const server = settingsReceiver(
    settings,
    token,
    ["127.0.0.1"],
    content,
    identity,
    undefined,
    maintenance,
    { status: () => check, cleared: () => clearChecks++ },
  );
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(directory, { recursive: true, force: true });
  });
  const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/internal/cache/v1/clear`;
  const post = (target: object, secret: string) =>
    fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(target),
    });
  assert.equal((await post(identity, "wrong")).status, 403);
  assert.equal(
    (await post({ ...identity, source_epoch: otherEpoch }, token)).status,
    409,
  );
  assert.equal((await content.read())?.generation, 2);
  assert.equal(clearChecks, 0);

  const response = await post(identity, token);
  assert.equal(response.status, 200);
  const receipt = await response.json();
  assert.equal(receipt.protocol, "cache-clear-1");
  assert.equal(receipt.removed_files, 8);
  assert.ok(receipt.removed_bytes > 0);
  assert.equal(clearChecks, 1);
  const status = await fetch(url.replace("/clear", "/status"), {
    headers: { Authorization: `Bearer ${token}` },
  });
  assert.deepEqual((await status.json()).sync_check, check);
  assert.deepEqual(
    (await maintenance.status()).resources.map((item) => item.status),
    ["missing", "missing", "missing"],
  );
  const files = await readdir(
    path.join(contentDirectory, "releases", "test", epoch),
  );
  assert.deepEqual(files.sort(), [
    "public-content.2.floor.json",
    "public-content.2.intent.json",
  ]);
  assert.equal(
    await readFile(path.join(contentDirectory, "keep.json"), "utf8"),
    "unrelated",
  );
  assert.equal((await unrelated.read("cache-policy"))?.revision, 1);
  await assert.rejects(readFile(path.join(contentDirectory, "current.json")), {
    code: "ENOENT",
  });

  const restarted = new FileContentStore(contentDirectory, "test", epoch);
  await restarted.apply(old);
  await settings.apply(policy(epoch, 1));
  await settings.apply(publicSettings(epoch, 1));
  await assert.rejects(restarted.read(), ClearedPublicContent);
  assert.equal(await settings.read("public-settings"), null);
  assert.equal(await settings.read("cache-policy"), null);
  assert.equal((await (await post(identity, token)).json()).removed_files, 0);
  await restarted.apply(current);
  await settings.apply(publicSettings(epoch, 2));
  await settings.apply(policy(epoch, 2));
  assert.deepEqual((await restarted.read())?.contents, []);
  assert.deepEqual(
    (await maintenance.status()).resources.map((item) => item.status),
    ["ready", "ready", "ready"],
  );
});
