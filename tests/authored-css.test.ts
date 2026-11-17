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

test("an authored CSS font scales once while nested font percentages inherit", () => {
  const { css, error } = compileAuthoredCss(
    "p { font: italic 20px/1.4 serif } p span { font-size: 80% }",
    "section-1",
  );
  assert.equal(error, undefined);
  assert.match(
    css,
    /font: italic calc\(20px \* var\(--public-font-scale, 1\)\)\/1\.4 serif/,
  );
  assert.match(css, /font-size: 80%/);
});
