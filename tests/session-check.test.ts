import assert from "node:assert/strict";
import test from "node:test";
import {
  createSessionCheck,
  type SessionView,
} from "../src/core/auth/session-check";
import { RequestError } from "../src/core/http/request";
import { readAdminSession } from "@/core/contracts/auth";
import type { AuthSessionState } from "@/core/contracts/auth";

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

test("logout invalidation cancels stale checks and clears offline identity recovery", async () => {
  const states: SessionView[] = [];
  const stale = deferred<AuthSessionState>();
  const fresh = deferred<AuthSessionState>();
  let reads = 0;
  const checker = createSessionCheck(
    async () => {
      reads++;
      if (reads === 1)
        return {
          ...admin,
          expires_at: new Date(Date.now() + 60000).toISOString(),
        };
      return reads === 2 ? stale.promise : fresh.promise;
    },
    (state) => states.push(state),
  );
  await checker.check();
  const old = checker.check(true);
  await flush();
  checker.invalidate();
  const boundary = states.length;
  const next = checker.check();
  await flush();
  assert.equal(reads, 3);
  stale.resolve(admin);
  await old;
  fresh.reject(new RequestError("network"));
  await next;
  assert.ok(states.slice(boundary).every((state) => state.phase !== "ready"));
  const latest = states.at(-1);
  assert.equal(latest?.phase, "failed");
  if (latest?.phase === "failed") assert.equal(latest.previous, undefined);
  checker.dispose();
});

test("offline revalidation keeps an already-open private editor until expiry; new access and explicit revocation fail closed", async () => {
  const states: SessionView[] = [];
  let failure: RequestError | null = null;
  const checker = createSessionCheck(
    async () => {
      if (failure) throw failure;
      return {
        ...admin,
        expires_at: new Date(Date.now() + 60000).toISOString(),
      };
    },
    (state) => states.push(state),
    true,
  );
  await checker.check();
  failure = new RequestError("network");
  await checker.check(true);
  assert.equal(states.at(-1)?.phase, "ready");
  failure = new RequestError("http", 403);
  await checker.check(true);
  assert.equal(states.at(-1)?.phase, "failed");
  checker.dispose();
  const cold: SessionView[] = [];
  const denied = createSessionCheck(
    async () => {
      throw new RequestError("network");
    },
    (state) => cold.push(state),
    true,
  );
  await denied.check(true);
  assert.equal(cold.at(-1)?.phase, "failed");
  denied.dispose();
});

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
