import assert from "node:assert/strict";
import test from "node:test";
import {
  scrollToAnchor,
  scrollToPosition,
  stopScrolling,
} from "../src/core/browser/scroll";

test("arrival feedback waits for scrolling, cancels cleanly, and works without motion", async () => {
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  let time = performance.now();
  let preference = "full";
  const windowMock = {
    scrollY: 0,
    innerHeight: 800,
    scrollTo({ top }: { top: number }) {
      this.scrollY = top;
    },
  };
  const target = {
    isConnected: true,
    parentElement: null,
    getBoundingClientRect: () => ({ top: 1000 - windowMock.scrollY }),
  };
  const globals: Record<string, unknown> = {
    window: windowMock,
    document: {
      documentElement: { scrollHeight: 3000, dataset: {} },
      getElementById: (id: string) =>
        id === "section-example" ? target : null,
    },
    localStorage: { getItem: () => preference },
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++frameId, callback);
      return frameId;
    },
    cancelAnimationFrame: (id: number) => frames.delete(id),
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
  const step = (milliseconds: number) => {
    time += milliseconds;
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(time));
  };
  let arrivals = 0;
  try {
    assert.equal(
      scrollToAnchor("#missing", () => arrivals++),
      false,
    );
    assert.equal(
      scrollToAnchor("#section-example", () => arrivals++),
      true,
    );
    assert.equal(arrivals, 0);
    step(300);
    await Promise.resolve();
    assert.equal(arrivals, 0);
    stopScrolling();
    await Promise.resolve();
    assert.equal(arrivals, 0);
    const interrupted = scrollToPosition(1200);
    stopScrolling();
    assert.equal(await interrupted, false);
    scrollToAnchor("#section-example", () => arrivals++);
    step(700);
    await Promise.resolve();
    assert.equal(arrivals, 1);
    assert.equal(windowMock.scrollY, 900);
    // Repeated location while already in place still produces feedback.
    scrollToAnchor("#section-example", () => arrivals++);
    await Promise.resolve();
    assert.equal(arrivals, 2);
    preference = "reduced";
    windowMock.scrollY = 0;
    scrollToAnchor("#section-example", () => arrivals++);
    await Promise.resolve();
    assert.equal(arrivals, 3);
    assert.equal(frames.size, 0);
    target.isConnected = false;
    scrollToAnchor("#section-example", () => arrivals++);
    await Promise.resolve();
    assert.equal(arrivals, 3);
  } finally {
    stopScrolling();
    for (const key of Object.keys(globals)) {
      if (previous[key]) Object.defineProperty(globalThis, key, previous[key]!);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
