import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { CompletionContext } from "@codemirror/autocomplete";
import {
  formulaTemplates,
  templateSource,
  templatePreview,
} from "../src/core/editor/formula/templates";
import {
  latexCompletions,
  latexLanguage,
} from "../src/core/editor/formula/latex-language";
import { formulaSourceRange } from "../src/core/editor/formula/selection";
import { renderFormula } from "../src/core/rendering/features/math";

test("all structured formula templates are compatible with the publication renderer", () => {
  for (const template of formulaTemplates) {
    assert.equal(
      renderFormula(template.preview ?? templatePreview(template.latex), true)
        .error,
      false,
      template.name,
    );
    const { before, after } = templateSource(template.latex);
    assert.doesNotMatch(before + after, /#(?:0|\?)/);
    assert.equal(
      renderFormula(before + "x" + after, true).error,
      false,
      template.name,
    );
  }
});
test("source templates wrap the selection without rewriting surrounding text", () => {
  const parts = templateSource(String.raw`\frac{#0}{#?}`, "a + b");
  assert.equal(
    parts.before + "a + b" + parts.after,
    String.raw`\frac{a + b}{}`,
  );
});
test("formula selection preserves literal source and rejects ambiguous occurrences", () => {
  const source = String.raw`\frac{ a+b }{ c } + x`;
  const selected = formulaSourceRange(source, "a+b");
  assert.deepEqual(selected, { start: 7, end: 10 });
  assert.equal(formulaSourceRange("x+x", "x"), undefined);
  assert.equal(formulaSourceRange(source, String.raw`\sqrt{x}`), undefined);
  assert.equal(formulaSourceRange(source, ""), undefined);
});
test("LaTeX completion uses explicit commands, not a plain text field", () => {
  const state = EditorState.create({
    doc: String.raw`\fra`,
    extensions: [latexLanguage],
  });
  const result = latexCompletions(new CompletionContext(state, 4, false));
  assert.equal(result?.from, 0);
  assert.ok(
    result?.options.some(
      (item) => item.label === String.raw`\frac` && item.apply,
    ),
  );
});
test("incomplete and oversized formulas retain a diagnostic and do not produce executable markup", () => {
  const invalid = renderFormula(String.raw`\frac{`, true);
  assert.equal(invalid.error, true);
  assert.ok(invalid.message);
  assert.equal(
    renderFormula("x".repeat(8001), true).message,
    "公式最多 8000 字符。",
  );
});
