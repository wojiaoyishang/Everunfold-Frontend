import assert from "node:assert/strict";
import test from "node:test";
import {
  horizontalTarget,
  installHorizontalWheel,
} from "../src/core/browser/horizontal-wheel";

test("rails release page scrolling at either edge and cap pending momentum", () => {
  assert.equal(horizontalTarget(0, 100, -120, 600, 300), null);
  assert.equal(horizontalTarget(600, 600, 120, 600, 300), null);
  assert.equal(horizontalTarget(421.333, 422, 120, 422, 300), null);
  assert.equal(horizontalTarget(0, 0, 120, 0, 300), null);
  assert.equal(horizontalTarget(100, 400, -40, 1000, 300), 60);
  assert.equal(horizontalTarget(100, 680, 120, 1000, 300), 700);
  assert.equal(horizontalTarget(100, 590, 120, 600, 300), 600);
});

test("wheel handler consumes only movable vertical input, animates, honors reduced motion, and cleans up", () => {
  class Rail extends EventTarget {
    scrollLeft = 0;
    scrollWidth = 1000;
    clientWidth = 400;
    scrollTo({ left }: { left: number }) {
      this.scrollLeft = left;
    }
  }
  const rail = new Rail();
  const windowMock = new EventTarget();
  const media = Object.assign(new EventTarget(), { matches: false });
  const frames = new Map<number, FrameRequestCallback>();
  let frameId = 0;
  let time = performance.now();
  let preference = "full";
  const globals: Record<string, unknown> = {
    window: windowMock,
    document: { documentElement: { dataset: {} } },
    localStorage: { getItem: () => preference },
    matchMedia: () => media,
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
  const step = () => {
    const pending = [...frames.values()];
    frames.clear();
    time += 16;
    pending.forEach((callback) => callback(time));
  };
  const wheel = (deltaY: number, extra: Record<string, unknown> = {}) => {
    const event = Object.assign(new Event("wheel", { cancelable: true }), {
      deltaY,
      deltaX: 0,
      deltaMode: 0,
      ctrlKey: false,
      metaKey: false,
      shiftKey: false,
      ...extra,
    });
    rail.dispatchEvent(event);
    return event.defaultPrevented;
  };
  let dispose: (() => void) | undefined;
  try {
    dispose = installHorizontalWheel(rail as unknown as HTMLElement);
    assert.equal(wheel(120), true);
    assert.equal(rail.scrollLeft, 0);
    step();
    const first = rail.scrollLeft;
    step();
    assert.ok(rail.scrollLeft > first && rail.scrollLeft < 120);
    for (let index = 0; index < 100; index++) step();
    assert.equal(rail.scrollLeft, 120);
    assert.equal(wheel(120, { ctrlKey: true }), false);
    assert.equal(wheel(120, { shiftKey: true }), false);
    assert.equal(wheel(2, { deltaX: 100 }), false);
    preference = "reduced";
    windowMock.dispatchEvent(new Event("everunfold:motion-change"));
    assert.equal(wheel(120), true);
    assert.equal(rail.scrollLeft, 240);
    rail.scrollLeft = 600;
    assert.equal(wheel(120), false);
    assert.equal(wheel(-120), true);
    assert.equal(rail.scrollLeft, 480);
    dispose();
    dispose = undefined;
    assert.equal(wheel(-120), false);
    assert.equal(frames.size, 0);
  } finally {
    dispose?.();
    for (const key of Object.keys(globals)) {
      const descriptor = previous[key];
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  }
});
