import assert from "node:assert/strict";
import test from "node:test";
import {
  motionPreference,
  resolveMotion,
} from "../src/core/browser/motion-policy";
import {
  playbackPreference,
  resolvePlayback,
} from "../src/core/browser/playback-policy";

test("the site's explicit full-motion default wins over OS reduced motion", () => {
  assert.equal(resolveMotion(motionPreference(null), true), true);
  assert.equal(resolveMotion("full", true), true);
  assert.equal(resolveMotion("reduced", false), false);
  assert.equal(resolveMotion("system", true), false);
  assert.equal(resolveMotion("system", false), true);
  assert.equal(motionPreference("invalid"), "full");
});

test("saved background choices take precedence while an untouched background follows motion", () => {
  assert.equal(resolvePlayback(playbackPreference(null), true), true);
  assert.equal(resolvePlayback(playbackPreference("invalid"), false), false);
  assert.equal(resolvePlayback(playbackPreference("pause"), true), false);
  assert.equal(resolvePlayback(playbackPreference("play"), false), true);
});
