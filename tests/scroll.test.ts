import assert from "node:assert/strict";
import test from "node:test";
import {
  easeOutExpo,
  dampedPosition,
  wheelDistance,
} from "../src/core/browser/scroll-policy";

test("wheel units preserve direction and fractional high-DPI deltas", () => {
  assert.equal(wheelDistance(-3, 1, 800), -96);
  assert.equal(wheelDistance(1, 2, 800), 800);
  assert.equal(wheelDistance(4.25, 0, 800), 4.25);
  assert.equal(wheelDistance(53.333333, 0, 800), 53.333333);
});

test("wheel momentum continues after input and is independent of display refresh rate", () => {
  function travel(step: number, time: number) {
    let position = 0;
    for (let elapsed = 0; elapsed < time; elapsed += step)
      position = dampedPosition(position, 600, Math.min(step, time - elapsed));
    return position;
  }
  assert.ok(travel(16, 100) < 400);
  assert.ok(travel(16, 500) > travel(16, 100));
  assert.ok(travel(16, 1100) > 599);
  assert.ok(Math.abs(travel(8, 500) - travel(16, 500)) < 0.01);
  assert.ok(dampedPosition(600, 300, 16) < 600);
  assert.ok(dampedPosition(600, 300, 16) > 300);
});

test("scroll easing reaches its target without overshooting or reversing", () => {
  const positions = Array.from({ length: 101 }, (_, index) =>
    easeOutExpo(index / 100),
  );
  assert.equal(positions[0], 0);
  assert.equal(positions.at(-1), 1);
  positions.forEach((value, index) => {
    assert.ok(value >= 0 && value <= 1);
    if (index) assert.ok(value >= positions[index - 1]);
  });
  assert.ok(positions[50] - positions[40] > positions[90] - positions[80]);
});
