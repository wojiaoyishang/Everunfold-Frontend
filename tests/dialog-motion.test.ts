import assert from "node:assert/strict";
import test from "node:test";
import { afterDialogMotion } from "../src/themes/argon/hooks/dialog-motion";

function motion(endTime = 190) {
  let finish!: () => void;
  let interrupt!: () => void;
  const finished = new Promise<Animation>((resolve, reject) => {
    finish = () => resolve(animation);
    interrupt = () => reject(new Error("animation cancelled"));
  });
  const animation = {
    playState: "running",
    effect: { getComputedTiming: () => ({ endTime }) },
    finished,
  } as Animation;
  return { animation, finish, interrupt };
}
const flush = async () => {
  for (let step = 0; step < 4; step++) await Promise.resolve();
};

test("dialog keeps focus containment until every finite exit finishes", async () => {
  const panel = motion();
  const backdrop = motion();
  let closed = 0;
  const cancel = afterDialogMotion(
    { getAnimations: () => [panel.animation, backdrop.animation] },
    () => closed++,
  );
  panel.finish();
  await flush();
  assert.equal(closed, 0);
  backdrop.finish();
  await flush();
  assert.equal(closed, 1);
  cancel();
  await flush();
  assert.equal(closed, 1);
});

test("reduced motion and infinite progress indicators do not delay dismissal", async () => {
  const spinner = motion(Infinity);
  for (const animations of [[], [spinner.animation]]) {
    let closed = 0;
    afterDialogMotion({ getAnimations: () => animations }, () => closed++);
    assert.equal(closed, 0);
    await flush();
    assert.equal(closed, 1);
  }
});

test("switching motion preference while closing still completes dismissal", async () => {
  const panel = motion();
  let closed = 0;
  afterDialogMotion({ getAnimations: () => [panel.animation] }, () => closed++);
  panel.interrupt();
  await flush();
  assert.equal(closed, 1);
});

test("unmount cleanup prevents stale navigation and also cancels zero-motion completion", async () => {
  const panel = motion();
  for (const animations of [[], [panel.animation]]) {
    let closed = 0;
    const cancel = afterDialogMotion(
      { getAnimations: () => animations },
      () => closed++,
    );
    cancel();
    panel.finish();
    await flush();
    assert.equal(closed, 0);
  }
});

test("unsupported animation APIs and stalled effects have a bounded fallback", async () => {
  const stalled = motion();
  for (const getAnimations of [
    () => {
      throw new Error("unsupported");
    },
    () => [stalled.animation],
  ]) {
    let closed = 0;
    await new Promise<void>((resolve) => {
      afterDialogMotion(
        { getAnimations },
        () => {
          closed++;
          resolve();
        },
        10,
      );
    });
    assert.equal(closed, 1);
    stalled.finish();
    await flush();
    assert.equal(closed, 1);
  }
});
