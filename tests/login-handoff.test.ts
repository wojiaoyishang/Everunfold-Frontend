import assert from "node:assert/strict";
import test from "node:test";
import { startLoginHandoff } from "../src/themes/argon/management/login-handoff";

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));
function surface() {
  const effects: Array<{
    finish(): void;
    cancelled: boolean;
    frames: Keyframe[];
  }> = [];
  const element = {
    animate(frames: Keyframe[]) {
      let done!: () => void;
      let failed!: () => void;
      const finished = new Promise<void>((yes, no) => {
        done = yes;
        failed = no;
      });
      const effect = {
        frames,
        cancelled: false,
        playState: "running",
        finished,
        finish() {
          effect.playState = "finished";
          done();
        },
        cancel() {
          effect.cancelled = true;
          effect.playState = "idle";
          failed();
        },
      };
      effects.push(effect);
      return effect as unknown as Animation;
    },
  } as Pick<HTMLElement, "animate">;
  return { element, effects };
}

test("navigation waits for the full success feedback and then the card handoff", async () => {
  const feedback = surface(),
    card = surface();
  const events: string[] = [];
  const cancel = startLoginHandoff({
    feedback: feedback.element,
    card: card.element,
    animated: true,
    onLeaving: () => events.push("leaving"),
    navigate: () => events.push("navigate"),
  });
  assert.deepEqual(events, []);
  assert.equal(card.effects.length, 0);
  feedback.effects[0].finish();
  await flush();
  assert.deepEqual(events, ["leaving"]);
  card.effects[0].finish();
  await flush();
  assert.deepEqual(events, ["leaving", "navigate"]);
  cancel();
});

test("unmount, destination change or Strict Mode cleanup cancels old navigation", async () => {
  for (const stage of ["confirming", "leaving"]) {
    const feedback = surface(),
      card = surface();
    let navigations = 0;
    const cancel = startLoginHandoff({
      feedback: feedback.element,
      card: card.element,
      animated: true,
      onLeaving: () => {},
      navigate: () => navigations++,
    });
    if (stage === "leaving") {
      feedback.effects[0].finish();
      await flush();
    }
    cancel();
    await flush();
    assert.equal(navigations, 0);
    assert.ok(feedback.effects.every((effect) => effect.cancelled));
    assert.ok(card.effects.every((effect) => effect.cancelled));
  }
});

test("reduced motion shows a brief static success without movement or animation dependencies", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const feedback = surface(),
    card = surface();
  let navigations = 0;
  const cancel = startLoginHandoff({
    feedback: feedback.element,
    card: card.element,
    animated: false,
    onLeaving: () => {},
    navigate: () => navigations++,
  });
  t.mock.timers.tick(449);
  await flush();
  assert.equal(navigations, 0);
  t.mock.timers.tick(1);
  await flush();
  assert.equal(navigations, 1);
  assert.equal(feedback.effects.length + card.effects.length, 0);
  cancel();
});

test("missing or paused animation completion cannot trap a successful login", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const feedback = surface(),
    card = surface();
  let navigations = 0;
  const cancel = startLoginHandoff({
    feedback: feedback.element,
    card: card.element,
    animated: true,
    onLeaving: () => {},
    navigate: () => navigations++,
  });
  t.mock.timers.tick(1200);
  await flush();
  assert.equal(navigations, 0);
  t.mock.timers.tick(420);
  await flush();
  assert.equal(navigations, 1);
  cancel();
});
