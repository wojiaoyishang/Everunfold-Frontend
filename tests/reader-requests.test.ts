import assert from "node:assert/strict";
import test from "node:test";
import { RequestError } from "../src/core/http/request";
import {
  readPreviewIdentity,
  readPreviewMetrics,
} from "@/core/contracts/reader-preview";
import { ReaderStore } from "../src/core/reader/store";
import { readerPhase, type Identity } from "../src/core/reader/state";

const idA = "00000000-0000-0000-0000-000000000001";
const idB = "00000000-0000-0000-0000-000000000002";
const at = "2026-10-31T10:00:00Z";
const ok = <T>(data: T) => ({ success: true, code: 200, msg: "ok", data });
const identity = (persona: "guest" | "member" = "guest"): Identity => ({
  mode: "demo",
  persona,
  display_name: "示例",
  sampled_at: at,
});
const delay = (ms = 20) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(check: () => boolean) {
  for (let attempt = 0; attempt < 100 && !check(); attempt++) await delay(5);
  assert.ok(check(), "request state did not settle");
}
const client = {
  identity: async (_base: string, query: { persona?: "guest" | "member" }) =>
    ok(identity(query.persona)),
  metrics: async (_base: string, query: { ids: string[] }) =>
    ok({
      mode: "demo" as const,
      sampled_at: at,
      items: query.ids.map((content_id) => ({ content_id, views: 0 })),
    }),
};

test("generated client validates demo values, preserves zero and makes a noncredentialed no-store GET", async () => {
  const result = await readPreviewMetrics(
    "http://example.test",
    { ids: [idA, idB] },
    {
      fetcher: async (input, options) => {
        assert.deepEqual(new URL(String(input)).searchParams.getAll("ids"), [
          idA,
          idB,
        ]);
        assert.equal(options?.method, "GET");
        assert.equal(options?.credentials, "omit");
        assert.equal(options?.cache, "no-store");
        return Response.json(await client.metrics("", { ids: [idA] }));
      },
    },
  );
  assert.equal(result.data.items[0].views, 0);
  await assert.rejects(
    readPreviewIdentity(
      "http://example.test",
      {},
      {
        fetcher: async () =>
          Response.json(
            ok({ ...identity(), mode: "real", token: "must-not-pass" }),
          ),
      },
    ),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "invalid",
  );
});

test("timeout covers response body, cancellation stays distinct, HTTP errors never become zero", async () => {
  await assert.rejects(
    readPreviewIdentity(
      "http://example.test",
      {},
      {
        timeoutMs: 10,
        fetcher: async () => new Response(new ReadableStream()),
      },
    ),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "timeout",
  );
  const controller = new AbortController();
  controller.abort();
  let calls = 0;
  await assert.rejects(
    readPreviewIdentity(
      "http://example.test",
      {},
      {
        signal: controller.signal,
        fetcher: async () => {
          calls++;
          return Response.json(ok(identity()));
        },
      },
    ),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "cancelled",
  );
  assert.equal(calls, 0);
  await assert.rejects(
    readPreviewIdentity(
      "http://example.test",
      {},
      {
        fetcher: async () => Response.json({ success: false }, { status: 503 }),
      },
    ),
    (error: unknown) => error instanceof RequestError && error.status === 503,
  );
});

test("page registration is generic, idle is not healthy, duplicate consumers share and release requests", async () => {
  let calls = 0;
  const store = new ReaderStore("http://example.test", {
    client,
    batchDelayMs: 0,
  });
  store.beginPage("/custom");
  assert.equal(readerPhase(store.getSnapshot()), "idle");
  assert.equal(store.getSnapshot().identity.status, "idle");
  const load = async () => {
    calls++;
    return { unrelatedFeature: true };
  };
  const first = store.registerTask("/custom", "page:weather", load);
  const second = store.registerTask("/custom", "page:weather", load);
  await until(() => readerPhase(store.getSnapshot()) === "ready");
  assert.equal(calls, 1);
  first();
  assert.equal(readerPhase(store.getSnapshot()), "ready");
  second();
  assert.equal(readerPhase(store.getSnapshot()), "idle");
  store.dispose();
});

test("visible metric requests are batched, deduplicated and do not fetch identity on listing pages", async () => {
  let batches = 0;
  let identityCalls = 0;
  const store = new ReaderStore("http://example.test", {
    batchDelayMs: 0,
    client: {
      identity: async (base, query) => {
        identityCalls++;
        return client.identity(base, query);
      },
      metrics: async (base, query) => {
        batches++;
        return client.metrics(base, query);
      },
    },
  });
  const releaseA = store.watchMetric("/", idA);
  const releaseAgain = store.watchMetric("/", idA);
  const releaseB = store.watchMetric("/", idB);
  assert.equal(store.getSnapshot().metrics[idA].status, "loading");
  await until(() => readerPhase(store.getSnapshot()) === "ready");
  assert.equal(batches, 1);
  assert.equal(identityCalls, 0);
  assert.deepEqual(store.getSnapshot().metrics[idA], {
    status: "ready",
    value: { content_id: idA, views: 0 },
  });
  releaseA();
  assert.ok(store.getSnapshot().metrics[idA]);
  releaseAgain();
  releaseB();
  assert.equal(readerPhase(store.getSnapshot()), "idle");
  store.dispose();
});

test("partial failures are local, retries are bounded, removed/old requests cannot resurrect", async () => {
  let attempts = 0;
  const store = new ReaderStore("http://example.test", {
    batchDelayMs: 0,
    retryDelayMs: 1,
    client: {
      ...client,
      metrics: async () => {
        attempts++;
        throw new RequestError("http", 503);
      },
    },
  });
  const release = store.registerIdentity("/article");
  store.watchMetric("/article", idA);
  await until(() => readerPhase(store.getSnapshot()) === "partial");
  assert.equal(attempts, 2);
  assert.equal(store.getSnapshot().identity.status, "ready");
  assert.equal(store.getSnapshot().metrics[idA].status, "error");
  store.beginPage("/another");
  release();
  assert.deepEqual(store.getSnapshot().requests, {});
  assert.equal(store.getSnapshot().identity.status, "idle");
  store.dispose();
});

test("late old-page results are ignored, unregister aborts and hides a pending capability", async () => {
  let finish: ((value: { obsolete: boolean }) => void) | undefined;
  const store = new ReaderStore("http://example.test", { client });
  const release = store.registerTask(
    "/a",
    "page:slow",
    () =>
      new Promise((resolve) => {
        finish = resolve;
      }),
  );
  store.beginPage("/b");
  store.registerTask("/b", "page:new", async () => 42);
  finish?.({ obsolete: true });
  release();
  await until(() => readerPhase(store.getSnapshot()) === "ready");
  assert.deepEqual(Object.keys(store.getSnapshot().requests), ["page:new"]);
  const remove = store.registerTask("/b", "page:removed", async () => {
    await delay();
    return true;
  });
  remove();
  await delay(40);
  assert.equal(store.getSnapshot().requests["page:removed"], undefined);
  store.dispose();
});

test("offline clears confirmed demo identity/metrics, recovery checks again instead of persisting login", async () => {
  const store = new ReaderStore("http://example.test", {
    client,
    batchDelayMs: 0,
  });
  store.registerIdentity("/article");
  store.watchMetric("/article", idA);
  await until(() => readerPhase(store.getSnapshot()) === "ready");
  store.selectPersona("member");
  await until(() => store.getSnapshot().identity.status === "ready");
  store.setOnline(false);
  await delay();
  assert.equal(readerPhase(store.getSnapshot()), "offline");
  assert.equal(store.getSnapshot().identity.status, "error");
  assert.equal(store.getSnapshot().metrics[idA].status, "error");
  store.setOnline(true);
  await until(() => readerPhase(store.getSnapshot()) === "ready");
  assert.equal(store.getSnapshot().identity.status, "ready");
  store.dispose();
});

test("remounting the same metric cannot accept a response from its previous registration", async () => {
  const finish: Array<() => void> = [];
  const store = new ReaderStore("http://example.test", {
    batchDelayMs: 0,
    client: {
      ...client,
      metrics: async (base, query) => {
        const views = finish.length + 1;
        await new Promise<void>((resolve) => finish.push(resolve));
        const response = await client.metrics(base, query);
        response.data.items.forEach((item) => {
          item.views = views;
        });
        return response;
      },
    },
  });
  const release = store.watchMetric("/article", idA);
  await until(() => finish.length === 1);
  release();
  store.watchMetric("/article", idA);
  await until(() => finish.length === 2);
  finish[1]();
  await until(() => readerPhase(store.getSnapshot()) === "ready");
  finish[0]();
  await delay();
  assert.deepEqual(store.getSnapshot().metrics[idA], {
    status: "ready",
    value: { content_id: idA, views: 2 },
  });
  store.dispose();
});
