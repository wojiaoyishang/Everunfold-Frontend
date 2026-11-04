import assert from "node:assert/strict";
import test from "node:test";
import {
  dispatchSceneShortcut,
  type SceneKeyEvent,
} from "../src/core/keyboard-shortcuts";

function key(values: Partial<SceneKeyEvent> = {}) {
  let prevented = false,
    stopped = false;
  const event: SceneKeyEvent = {
    key: "s",
    ctrlKey: true,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    defaultPrevented: false,
    preventDefault: () => {
      prevented = true;
    },
    stopPropagation: () => {
      stopped = true;
    },
    ...values,
  };
  return { event, result: () => ({ prevented, stopped }) };
}
test("registered save keys intercept Windows/macOS and shifted Save As without intercepting unrelated keys", () => {
  let calls = 0;
  const bindings = [{ key: "s", shift: "any" as const, run: () => calls++ }];
  for (const modifiers of [
    {},
    { ctrlKey: false, metaKey: true },
    { shiftKey: true, key: "S" },
  ]) {
    const input = key(modifiers);
    assert.equal(dispatchSceneShortcut(input.event, bindings), true);
    assert.deepEqual(input.result(), { prevented: true, stopped: true });
  }
  assert.equal(calls, 3);
  for (const modifiers of [
    { key: "p" },
    { ctrlKey: false },
    { altKey: true },
    { defaultPrevented: true },
  ]) {
    const input = key(modifiers);
    assert.equal(dispatchSceneShortcut(input.event, bindings), false);
    assert.deepEqual(input.result(), { prevented: false, stopped: false });
  }
});
test("held keys, composition and modal suspension still block browser Save but never invoke the action", () => {
  let calls = 0;
  const bindings = [{ key: "s", run: () => calls++ }];
  for (const modifiers of [{ repeat: true }, { isComposing: true }, {}]) {
    const input = key(modifiers);
    assert.equal(
      dispatchSceneShortcut(
        input.event,
        bindings,
        !modifiers.repeat && !modifiers.isComposing,
      ),
      true,
    );
    assert.equal(input.result().prevented, true);
    assert.equal(
      input.result().stopped,
      Boolean(modifiers.repeat || modifiers.isComposing),
    );
  }
  assert.equal(calls, 0);
});
