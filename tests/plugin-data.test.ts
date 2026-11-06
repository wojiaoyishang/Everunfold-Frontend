import assert from "node:assert/strict";
import test from "node:test";
import {
  createPluginDataSource,
  type PluginDataNotice,
  type PluginDataValue,
} from "../src/core/plugin-data/source";

function fixture() {
  let notify: (notice: PluginDataNotice) => void = () => {};
  let current = 1,
    epoch = "epoch-a",
    calls = 0,
    stopped = 0,
    fail = false;
  const source = createPluginDataSource({
    id: "fixture.data",
    scope: "session",
    async refresh() {
      calls++;
      if (fail) throw new Error("Backend unavailable");
      return {
        resource_id: "fixture.data",
        scope: "session" as const,
        source_epoch: epoch,
        revision: current,
        updated_at: "2026-11-07T00:00:00Z",
        data: { current },
      };
    },
    subscribe(
      _params: undefined,
      listener: (notice: PluginDataNotice) => void,
    ) {
      notify = listener;
      return () => {
        stopped++;
      };
    },
  });
  return {
    source,
    notify: (revision: number, nextEpoch = epoch) => {
      current = revision;
      epoch = nextEpoch;
      notify({
        resource_id: "fixture.data",
        revision,
        source_epoch: nextEpoch,
      });
    },
    change: (revision: number) => {
      current = revision;
    },
    failure: (value: boolean) => {
      fail = value;
    },
    calls: () => calls,
    stopped: () => stopped,
  };
}
const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("backend notices trigger an authorized refresh, ignore stale/retired stamps and allow retry after failure", async () => {
  const f = fixture(),
    values: PluginDataValue<{ current: number }>[] = [],
    errors: unknown[] = [];
  const stop = f.source.subscribe(
    undefined,
    (value) => values.push(value),
    (error) => errors.push(error),
  );
  f.notify(2);
  await tick();
  assert.equal(values[0].revision, 2);
  const calls = f.calls();
  f.notify(1);
  await tick();
  assert.equal(f.calls(), calls);
  f.failure(true);
  f.notify(3);
  await tick();
  assert.equal(errors.length, 1);
  f.failure(false);
  f.notify(3);
  await tick();
  assert.equal(values.at(-1)?.revision, 3);
  f.notify(1, "epoch-b");
  await tick();
  assert.equal(values.at(-1)?.source_epoch, "epoch-b");
  const before = values.length;
  f.notify(99, "epoch-a");
  await tick();
  assert.equal(values.length, before);
  stop();
  stop();
  assert.equal(f.stopped(), 1);
});

test("wait catches up a result delivered before subscription, cleans up after success, abort and timeout", async () => {
  const f = fixture();
  f.change(3);
  assert.equal(
    (await f.source.wait(undefined, { afterRevision: 1, timeoutMs: 1000 }))
      .revision,
    3,
  );
  assert.equal(f.stopped(), 1);
  const controller = new AbortController();
  const aborted = f.source.wait(undefined, {
    afterRevision: 3,
    timeoutMs: 1000,
    signal: controller.signal,
  });
  controller.abort();
  await assert.rejects(aborted, /abort/i);
  await assert.rejects(
    f.source.wait(undefined, { afterRevision: 3, timeoutMs: 10 }),
    /timed out/,
  );
  assert.equal(f.stopped(), 3);
});

test("capabilities reflect real drivers; no notification or deferred endpoint is simulated", async () => {
  const f = fixture();
  assert.equal(f.source.capabilities.deferred, false);
  assert.throws(
    () => f.source.request(undefined, "operation"),
    /does not provide deferred/,
  );
  const source = createPluginDataSource({
    id: "fixture.data",
    scope: "public",
    async refresh() {
      return {
        resource_id: "different",
        scope: "public" as const,
        source_epoch: null,
        revision: 1,
        updated_at: "2026-11-07T00:00:00Z",
        data: null,
      };
    },
  });
  assert.equal(source.capabilities.notifications, false);
  await assert.rejects(source.refresh(undefined), /Invalid plugin data result/);
  await assert.rejects(
    source.wait(undefined, { afterRevision: 1, timeoutMs: 50 }),
    /does not provide backend notifications/,
  );
});
