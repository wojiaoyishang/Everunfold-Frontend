import assert from "node:assert/strict";
import test from "node:test";
import { compileAuthoredCss } from "../src/core/rendering/authored-css";

test("authored CSS scopes the subject of selector lists and pseudo-elements", () => {
  const { css, error } = compileAuthoredCss(
    "@media (width < 650px) { :scope + p, h2:is(.one, .two)::before { color: red } }",
    "section-1",
  );
  assert.equal(error, undefined);
  assert.match(css, /\[data-authored-css="section-1"\] \+ p:where\(/);
  assert.match(css, /h2:is\(\.one, \.two\):where\([^)]*\)::before/);
});

test("authored CSS cannot introduce external styles, resource requests or HTML", () => {
  for (const input of [
    '@import "https://example.invalid/fixtures.css";',
    '.mark { background: image-set("https://example.invalid/cover.webp" 1x); }',
    '.mark { background: url/**/("https://example.invalid/cover.webp"); }',
    '.mark::before { content: "</STYLE>"; }',
  ]) {
    assert.deepEqual(compileAuthoredCss(input, "one"), {
      css: "",
      error: "unsupported",
    });
  }
});
