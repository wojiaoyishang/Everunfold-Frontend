import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";
import { waitForAnchorLayout } from "../src/core/browser/anchor-readiness";
import { scrollToAnchor, stopScrolling } from "../src/core/browser/scroll";

function environment(t: TestContext) {
  let now = 0;
  let sequence = 0;
  const timers = new Map<number, { at: number; run: () => void }>();
  const positions: number[] = [];
  const view = Object.assign(new EventTarget(), {
    location: { pathname: "/article", search: "" },
    scrollY: 0,
    innerHeight: 800,
    scrollTo({ top }: { top: number }) {
      this.scrollY = top;
      positions.push(top);
    },
  });
  function element(top: number) {
    return {
      top,
      visible: true,
      isConnected: true,
      parentElement: null,
      getClientRects() {
        return this.visible ? [this.getBoundingClientRect()] : [];
      },
      getBoundingClientRect() {
        return {
          top: this.top - view.scrollY,
          left: 0,
          width: 600,
          height: 100,
        };
      },
    };
  }
  const target = element(1600);
  const image = Object.assign(element(400), {
    complete: false,
    loading: "lazy",
  });
  const below = Object.assign(element(2200), {
    complete: false,
    loading: "lazy",
  });
  const pending = element(500);
  const doc = {
    readyState: "loading",
    fonts: { status: "loading" },
    documentElement: { scrollHeight: 4000, dataset: {} },
    images: [image, below],
    pending: [pending],
    getElementById: () => target,
    querySelectorAll(selector: string) {
      return selector.startsWith("img") ? this.images : this.pending;
    },
  };
  const globals: Record<string, unknown> = {
    window: view,
    document: doc,
    localStorage: { getItem: () => "reduced" },
    matchMedia: () => ({ matches: true }),
    setTimeout(run: () => void, delay: number) {
      timers.set(++sequence, { at: now + delay, run });
      return sequence;
    },
    clearTimeout(id: number) {
      timers.delete(id);
    },
  };
  const previous = Object.fromEntries(
    Object.keys(globals).map((key) => [
      key,
      Object.getOwnPropertyDescriptor(globalThis, key),
    ]),
  );
  for (const [key, value] of Object.entries(globals))
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  t.mock.method(performance, "now", () => now);
  t.after(() => {
    stopScrolling();
    for (const key of Object.keys(globals)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]!);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  return {
    view,
    doc,
    target,
    image,
    below,
    timers,
    positions,
    anchor: target as unknown as HTMLElement,
    tick(ms: number) {
      const end = now + ms;
      for (;;) {
        const next = [...timers].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        timers.delete(next[0]);
        now = next[1].at;
        next[1].run();
      }
      now = end;
    },
    loaded() {
      doc.readyState = "complete";
      doc.fonts.status = "loaded";
      doc.pending = [];
      image.complete = true;
    },
  };
}

test("comment location waits for document, fonts, images and component layout", async (t) => {
  const env = environment(t);
  let result: boolean | undefined;
  const done = waitForAnchorLayout(
    env.anchor,
    new AbortController().signal,
  ).then((value) => {
    result = value;
  });
  env.tick(500);
  await Promise.resolve();
  assert.equal(result, undefined);
  assert.equal(env.image.loading, "eager");
  assert.equal(env.below.loading, "lazy");
  env.doc.readyState = "complete";
  env.doc.fonts.status = "loaded";
  env.image.complete = true; // Failed images also finish; do not wait forever for naturalWidth.
  env.tick(500);
  await Promise.resolve();
  assert.equal(
    result,
    undefined,
    "a pending plugin or frame still owns layout",
  );
  env.doc.pending = [];
  env.tick(100);
  env.target.top += 220;
  env.tick(200);
  await Promise.resolve();
  assert.equal(
    result,
    undefined,
    "a late layout shift restarts the quiet interval",
  );
  env.tick(200);
  await done;
  assert.equal(result, true);
  assert.equal(env.timers.size, 0);
});

test("manual interaction, navigation, unmount and timeout cancel deferred location", async (t) => {
  const env = environment(t);
  for (const kind of [
    "wheel",
    "touchstart",
    "pointerdown",
    "keydown",
    "popstate",
    "abort",
    "unmount",
    "route",
    "timeout",
  ]) {
    env.target.isConnected = true;
    env.view.location.pathname = "/article";
    const controller = new AbortController();
    const done = waitForAnchorLayout(env.anchor, controller.signal, {
      timeoutMs: 1000,
    });
    if (kind === "abort") controller.abort();
    else if (kind === "unmount") env.target.isConnected = false;
    else if (kind === "route") env.view.location.pathname = "/other";
    else if (kind !== "timeout") env.view.dispatchEvent(new Event(kind));
    env.tick(1000);
    assert.equal(await done, false, kind);
    assert.equal(env.timers.size, 0, kind);
  }
});

test("deferred comment scrolling calculates its destination after loading and retains cancellation ownership", async (t) => {
  const env = environment(t);
  let arrivals = 0;
  const old = new AbortController();
  scrollToAnchor(
    "#comment-reader",
    () => {
      arrivals += 100;
    },
    old.signal,
  );
  env.tick(1000);
  assert.equal(env.positions.length, 0);
  const current = new AbortController();
  scrollToAnchor(
    "#comment-reader",
    () => {
      arrivals++;
    },
    current.signal,
  );
  old.abort();
  env.target.top = 1900;
  env.loaded();
  env.tick(500);
  await Promise.resolve();
  await Promise.resolve();
  assert.deepEqual(env.positions, [1800]);
  assert.equal(arrivals, 1);
  assert.equal(env.timers.size, 0);
  env.image.complete = false;
  scrollToAnchor(
    "#comment-reader",
    () => {
      arrivals++;
    },
    current.signal,
  );
  current.abort();
  env.loaded();
  env.tick(1000);
  await Promise.resolve();
  assert.equal(arrivals, 1);
  assert.deepEqual(env.positions, [1800]);
});
