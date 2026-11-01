import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import { FileSettingsStore } from "../src/server/settings/store";
import { settingsReceiver } from "../src/server/settings/receiver";
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
    const server = settingsReceiver(store, token, peers);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}/internal/settings/apply`;
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
