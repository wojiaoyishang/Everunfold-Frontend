import assert from "node:assert/strict";
import test from "node:test";
import {
  motionPreference,
  resolveMotion,
} from "../src/core/browser/motion-policy";

test("the site's explicit full-motion default wins over OS reduced motion", () => {
  assert.equal(resolveMotion(motionPreference(null), true), true);
  assert.equal(resolveMotion("full", true), true);
  assert.equal(resolveMotion("reduced", false), false);
  assert.equal(resolveMotion("system", true), false);
  assert.equal(resolveMotion("system", false), true);
  assert.equal(motionPreference("invalid"), "full");
});
