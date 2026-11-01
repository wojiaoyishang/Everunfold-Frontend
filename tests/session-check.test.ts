import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionCheck,
  type SessionView,
} from "../src/core/auth/session-check";
import { RequestError } from "../src/core/http/request";
import { readAdminSession } from "../src/generated/auth-client";
import type { AuthSessionState } from "../src/generated/auth-contract";

const admin: AuthSessionState = {
  authenticated: true,
  user: {
    id: "00000000-0000-0000-0000-000000000001",
    username: "tester",
    display_name: "Tester",
    role: "admin",
  },
  csrf_token: "test-only-csrf",
  expires_at: "2026-11-02T00:00:00Z",
};
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

test("initial, focus and restore checks share the pending request without aborting it", async () => {
  const request = deferred<AuthSessionState>();
  const states: SessionView[] = [];
  let reads = 0;
  let signal: AbortSignal | undefined;
  const checker = createSessionCheck(
    (input) => {
      reads++;
      signal = input;
      return request.promise;
    },
    (view) => states.push(view),
    true,
  );
  const first = checker.check();
  await flush();
  for (let i = 0; i < 20; i++) assert.equal(checker.check(i % 2 === 0), first);
  assert.equal(reads, 1);
  assert.equal(signal?.aborted, false);
  request.resolve(admin);
  await first;
  assert.deepEqual(
    states.map((state) => state.phase),
    ["checking", "ready"],
  );
  checker.dispose();
});

test("repeated focus cannot extend the real transport's eight-second timeout", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const states: SessionView[] = [];
  let reads = 0;
  const checker = createSessionCheck(
    async (signal) => {
      const result = await readAdminSession("http://example.test", {
        signal,
        fetcher: async () => {
          reads++;
          return new Promise<Response>(() => {});
        },
      });
      return result.data;
    },
    (state) => states.push(state),
    true,
  );
  const pending = checker.check();
  await flush();
  for (let i = 0; i < 8; i++) {
    assert.equal(checker.check(true), pending);
    t.mock.timers.tick(1000);
    await flush();
  }
  await pending;
  assert.equal(reads, 1);
  const last = states.at(-1);
  assert.equal(last?.phase, "failed");
  assert.ok(
    last?.phase === "failed" &&
      last.error instanceof RequestError &&
      last.error.kind === "timeout",
  );
  checker.dispose();
});

test("background revalidation keeps the page stable but revocation immediately removes authorization", async () => {
  const states: SessionView[] = [];
  let next: Promise<AuthSessionState> = Promise.resolve(admin);
  const checker = createSessionCheck(
    () => next,
    (state) => states.push(state),
    true,
  );
  await checker.check();
  const request = deferred<AuthSessionState>();
  next = request.promise;
  const pending = checker.check(true);
  await flush();
  assert.equal(states.at(-1)?.phase, "ready");
  request.reject(new RequestError("http", 401));
  await pending;
  assert.deepEqual(
    states.map((state) => state.phase),
    ["checking", "ready", "failed"],
  );
  next = Promise.resolve(admin);
  await checker.check();
  assert.equal(states.at(-1)?.phase, "ready");
  checker.dispose();
});

test("a stale check cannot overwrite accepted login or survive an unmount", async () => {
  const states: SessionView[] = [];
  const old = deferred<AuthSessionState>();
  const checker = createSessionCheck(
    () => old.promise,
    (state) => states.push(state),
  );
  const pending = checker.check();
  await flush();
  checker.accept(admin);
  old.resolve({ ...admin, authenticated: false, user: null });
  await pending;
  assert.deepEqual(states.at(-1), { phase: "ready", session: admin });
  checker.dispose();
  await checker.check();
  assert.equal(states.length, 2);
  let calls = 0;
  const discarded = createSessionCheck(
    async () => {
      calls++;
      return admin;
    },
    () => {},
  );
  const queued = discarded.check();
  discarded.dispose();
  await queued;
  assert.equal(calls, 0);
});
