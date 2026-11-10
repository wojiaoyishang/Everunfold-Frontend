import assert from "node:assert/strict";
import test from "node:test";
import {
  announceSessionChange,
  watchSessionChange,
} from "../src/core/auth/session-events";

test("session invalidations contain no identity and refresh only their backend, with cleanup", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalChannel = globalThis.BroadcastChannel;
  const target = new EventTarget();
  const messages: unknown[] = [];
  const channels = new Set<FakeChannel>();
  class FakeChannel {
    onmessage: ((event: MessageEvent<unknown>) => void) | null = null;
    constructor() {
      channels.add(this);
    }
    postMessage(data: unknown) {
      messages.push(data);
      for (const channel of channels)
        if (channel !== this) channel.onmessage?.({ data } as MessageEvent);
    }
    close() {
      channels.delete(this);
    }
  }
  Object.defineProperty(globalThis, "window", {
    value: target,
    configurable: true,
  });
  globalThis.BroadcastChannel =
    FakeChannel as unknown as typeof BroadcastChannel;
  let current = 0;
  let other = 0;
  let owner = 0;
  const logoutSignals: boolean[] = [];
  const stop = watchSessionChange("https://one.invalid/", () => current++);
  const stopOther = watchSessionChange("https://two.invalid", () => other++);
  const stopOwner = watchSessionChange(
    "https://one.invalid",
    () => owner++,
    "owner",
  );
  const stopReceiver = watchSessionChange(
    "https://one.invalid",
    (signedOut) => logoutSignals.push(signedOut),
    "receiver",
  );
  try {
    announceSessionChange("https://one.invalid");
    assert.ok(current > 0);
    assert.equal(other, 0);
    assert.deepEqual(messages, [
      { type: "changed", target: "https://one.invalid" },
    ]);
    const ownerBefore = owner;
    logoutSignals.length = 0;
    announceSessionChange("https://one.invalid", true, "owner");
    assert.equal(owner, ownerBefore);
    assert.ok(logoutSignals.length > 0);
    assert.ok(logoutSignals.every(Boolean));
    const before = current;
    stop();
    announceSessionChange("https://one.invalid/");
    assert.equal(current, before);
    assert.equal(other, 0);
    stopOther();
    stopOwner();
    stopReceiver();
    assert.equal(channels.size, 0);
  } finally {
    stop();
    stopOther();
    stopOwner();
    stopReceiver();
    globalThis.BroadcastChannel = originalChannel;
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("same-page invalidation still works when BroadcastChannel is unavailable", () => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalChannel = globalThis.BroadcastChannel;
  Object.defineProperty(globalThis, "window", {
    value: new EventTarget(),
    configurable: true,
  });
  globalThis.BroadcastChannel = class {
    constructor() {
      throw new Error("Channel blocked");
    }
  } as unknown as typeof BroadcastChannel;
  let calls = 0;
  const stop = watchSessionChange("https://one.invalid", () => calls++);
  try {
    assert.doesNotThrow(() => announceSessionChange("https://one.invalid"));
    assert.equal(calls, 1);
  } finally {
    stop();
    globalThis.BroadcastChannel = originalChannel;
    if (originalWindow)
      Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
