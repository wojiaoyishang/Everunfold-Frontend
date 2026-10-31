import assert from "node:assert/strict";
import test from "node:test";
import {
  NavigationTransaction,
  SLOW_NAVIGATION_MS,
  NAVIGATION_TIMEOUT_MS,
  NAVIGATION_FAILURE_EMPHASIS_MS,
  NAVIGATION_FAILURE_HOLD_MS,
  type NavigationIntent,
} from "../src/core/navigation/transaction";
import {
  NavigationLoadError,
  prepareNavigationDocument,
} from "../src/core/navigation/document";

const intent: NavigationIntent = {
  href: "/next.html#comments",
  origin: "https://example.com/?page=2",
  scroll: true,
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

test("a full response is required: streamed headers and partial HTML cannot count as ready", async () => {
  let stream!: ReadableStreamDefaultController<Uint8Array>;
  const response = new Response(
    new ReadableStream({
      start(controller) {
        stream = controller;
      },
    }),
    { headers: { "content-type": "text/html" } },
  );
  let ready = false;
  const preparing = prepareNavigationDocument(
    intent.href,
    new AbortController().signal,
    async () => response,
  ).then(() => {
    ready = true;
  });
  stream.enqueue(
    new TextEncoder().encode('<span hidden data-page-ready="true"></span>'),
  );
  await flush();
  assert.equal(ready, false);
  stream.close();
  await preparing;
  assert.equal(ready, true);
});

test("HTTP failure, wrong content type and incomplete render are never committed", async () => {
  for (const [response, reason] of [
    [new Response("missing", { status: 404 }), "not-found"],
    [new Response("unavailable", { status: 503 }), "unavailable"],
    [
      new Response("{}", { headers: { "content-type": "application/json" } }),
      "unavailable",
    ],
    [
      new Response("<main>error</main>", {
        headers: { "content-type": "text/html" },
      }),
      "render",
    ],
  ] as const) {
    await assert.rejects(
      prepareNavigationDocument(
        intent.href,
        new AbortController().signal,
        async () => response,
      ),
      (error: unknown) =>
        error instanceof NavigationLoadError && error.reason === reason,
    );
  }
});

test("five seconds expands feedback; timeout aborts and rejects even a late successful response", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const result = deferred<void>();
  let signal!: AbortSignal;
  let commits = 0;
  const transaction = new NavigationTransaction({
    prepare: (_, current) => {
      signal = current;
      return result.promise;
    },
    commit: () => {
      commits++;
    },
    abandon: () => assert.fail("preparation must not touch history"),
  });
  transaction.start(intent);
  context.mock.timers.tick(SLOW_NAVIGATION_MS - 1);
  assert.equal(transaction.getSnapshot().phase, "loading");
  context.mock.timers.tick(1);
  assert.equal(transaction.getSnapshot().phase, "slow");
  context.mock.timers.tick(NAVIGATION_TIMEOUT_MS - SLOW_NAVIGATION_MS);
  assert.equal(transaction.getSnapshot().failure, "timeout");
  assert.equal(transaction.getSnapshot().attention, true);
  assert.equal(signal.aborted, true);
  result.resolve();
  await flush();
  assert.equal(commits, 0);
  assert.equal(transaction.getSnapshot().phase, "failed");
  context.mock.timers.tick(NAVIGATION_FAILURE_EMPHASIS_MS - 1);
  assert.equal(transaction.getSnapshot().attention, true);
  context.mock.timers.tick(1);
  assert.equal(transaction.getSnapshot().attention, false);
  context.mock.timers.tick(5_000);
  assert.equal(transaction.getSnapshot().phase, "failed");
  context.mock.timers.tick(NAVIGATION_FAILURE_HOLD_MS - 5_000 - 1);
  assert.equal(transaction.getSnapshot().phase, "failed");
  context.mock.timers.tick(1);
  assert.equal(transaction.getSnapshot().phase, "idle");
  assert.equal(transaction.getSnapshot().intent, undefined);
});

test("old failure dismissal cannot hide a newer navigation, including another failure", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const transaction = new NavigationTransaction({
    prepare: async () => {
      throw new NavigationLoadError("unavailable");
    },
    commit: () => assert.fail("failed content cannot commit"),
    abandon: () => assert.fail("preparation cannot touch history"),
  });
  transaction.start(intent);
  await flush();
  context.mock.timers.tick(NAVIGATION_FAILURE_EMPHASIS_MS);
  context.mock.timers.tick(NAVIGATION_FAILURE_HOLD_MS - 100);
  const next = { ...intent, href: "/newer.html" };
  transaction.start(next);
  assert.equal(transaction.getSnapshot().phase, "loading");
  await flush();
  context.mock.timers.tick(100);
  assert.equal(transaction.getSnapshot().phase, "failed");
  assert.equal(transaction.getSnapshot().attention, true);
  assert.equal(transaction.getSnapshot().intent?.href, next.href);
  transaction.cancel(false);
  context.mock.timers.tick(
    NAVIGATION_FAILURE_EMPHASIS_MS + NAVIGATION_FAILURE_HOLD_MS,
  );
  assert.equal(transaction.getSnapshot().phase, "idle");
});

test("only the most recent choice commits; repeated clicks do not extend the deadline", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  const pending: {
    result: ReturnType<typeof deferred<void>>;
    signal: AbortSignal;
  }[] = [];
  const commits: string[] = [];
  const transaction = new NavigationTransaction({
    prepare: (_, signal) => {
      const result = deferred<void>();
      pending.push({ result, signal });
      return result.promise;
    },
    commit: (request) => commits.push(request.href),
    abandon: () => {},
  });
  transaction.start(intent);
  transaction.start(intent);
  assert.equal(pending.length, 1);
  const latest = { ...intent, href: "/last.html" };
  transaction.start(latest);
  assert.equal(pending[0].signal.aborted, true);
  pending[0].result.resolve();
  await flush();
  assert.deepEqual(commits, []);
  pending[1].result.resolve();
  await flush();
  assert.deepEqual(commits, [latest.href]);
  assert.equal(transaction.complete(intent.href), null);
  assert.deepEqual(transaction.complete(latest.href), latest);
  context.mock.timers.tick(NAVIGATION_TIMEOUT_MS);
  assert.equal(transaction.getSnapshot().phase, "idle");
});

test("cancel and browser history interrupt a prepared transition without stale history writes", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let rollbacks = 0;
  const transaction = new NavigationTransaction({
    prepare: async () => {},
    commit: () => {},
    abandon: () => {
      rollbacks++;
    },
  });
  transaction.start(intent);
  await flush();
  transaction.cancel(false);
  assert.equal(rollbacks, 0);
  assert.equal(transaction.complete(intent.href), null);
  transaction.start(intent);
  await flush();
  transaction.cancel();
  assert.equal(rollbacks, 1);
  context.mock.timers.tick(NAVIGATION_TIMEOUT_MS);
  assert.equal(transaction.getSnapshot().phase, "idle");
});

test("the deadline covers Next commit too; retry and Unicode destinations retain their intent", async (context) => {
  context.mock.timers.enable({ apis: ["setTimeout"] });
  let rollbacks = 0;
  const transaction = new NavigationTransaction({
    prepare: async () => {},
    commit: () => {},
    abandon: () => {
      rollbacks++;
    },
  });
  const request = {
    ...intent,
    href: "/%E4%B8%AD%E6%96%87.html?q=hello#comments",
    replace: true,
    scroll: false,
  };
  transaction.start(request);
  await flush();
  context.mock.timers.tick(NAVIGATION_TIMEOUT_MS);
  assert.equal(rollbacks, 1);
  const retry = transaction.getSnapshot().intent!;
  transaction.start(retry);
  await flush();
  assert.deepEqual(transaction.complete("/中文.html?q=hello"), request);
  context.mock.timers.tick(480);
  assert.equal(transaction.getSnapshot().phase, "idle");
});
