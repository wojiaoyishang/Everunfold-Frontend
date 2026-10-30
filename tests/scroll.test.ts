import assert from "node:assert/strict";
import test from "node:test";
import {
  easeOutExpo,
  isSteppedWheel,
  wheelDistance,
} from "../src/core/browser/scroll-policy";

test("wheel units preserve direction and high-resolution touchpad input stays native", () => {
  assert.equal(wheelDistance(-3, 1, 800), -96);
  assert.equal(wheelDistance(1, 2, 800), 800);
  assert.equal(wheelDistance(4.25, 0, 800), 4.25);
  assert.equal(isSteppedWheel(4.25, 0), false);
  assert.equal(isSteppedWheel(-12, 0), false);
  assert.equal(isSteppedWheel(100, 0), true);
  assert.equal(isSteppedWheel(-3, 1), true);
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
