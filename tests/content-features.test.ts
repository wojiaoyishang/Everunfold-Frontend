import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { parseDocument, DomUtils } from "htmlparser2";
import { getSchema } from "@tiptap/core";
import { renderContent } from "../src/core/rendering/content";
import { enhanceContentHtml } from "../src/core/rendering/features/content-features";
import { renderFormula } from "../src/core/rendering/features/math";
import { featureSource } from "../src/core/editor/content-feature-source";
import { sourceDocument, renderRichNode } from "../src/core/editor/rich-text";
import {
  markdownRichSource,
  patchVisualMarkdown,
} from "../src/core/editor/visual-markdown";
import { htmlRichSource } from "../src/core/editor/visual-document";
import { patchVisualHtml } from "../src/core/editor/patch-visual-html";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { ContentResources } from "../src/themes/argon/components/content-resources";

const render = (source: string, type: "html" | "markdown" = "markdown") =>
  renderContent({
    id: "features",
    content: [{ id: "block", type, content: source }],
    media_urls: {},
  });
test("plain articles and literal code do not request unused feature assets", () => {
  const rendered = render("普通文章，价格 $5 和 $10。`$x$`\n\n\\$不是公式");
  assert.deepEqual(rendered.features, { code: false, math: false });
  assert.equal(
    renderToStaticMarkup(
      createElement(ContentResources, { features: rendered.features }),
    ),
    "",
  );
  const literal = render(
    '```html\n<span data-math="inline" data-latex="x">x</span>\n```',
  );
  assert.deepEqual(literal.features, { code: true, math: false });
});
test("Markdown formulas and HTML formulas use the same accessible renderer", async () => {
  const md = render("行内 $a^2$。\n\n$$\n\\frac{1}{3}\n$$");
  assert.deepEqual(md.features, { code: false, math: true });
  const html = render(
    featureSource(
      "math",
      { source: String.raw`\frac{1}{3}`, display: true, language: "plaintext" },
      "html",
    ),
    "html",
  );
  const [first, second] = await Promise.all([
    enhanceContentHtml(md.html),
    enhanceContentHtml(html.html),
  ]);
  assert.match(first, /<math .*MathML/);
  assert.match(
    second,
    /<annotation encoding="application\/x-tex">\\frac\{1\}\{3\}/,
  );
  assert.equal(first.split('data-typeset="true"').length - 1, 2);
  const assets = renderToStaticMarkup(
    createElement(ContentResources, { features: md.features }),
  );
  assert.match(assets, /katex-0\.19\.1/);
  assert.doesNotMatch(assets, /code-v1/);
});
test("both code formats highlight the declared language without executing code", async () => {
  for (const format of ["markdown", "html"] as const) {
    const source = featureSource(
      "code",
      {
        source: 'const value = "<script>alert(1)</script>";',
        language: "js",
        display: true,
      },
      format,
    );
    const rendered = render(source, format);
    const html = await enhanceContentHtml(rendered.html);
    assert.match(html, /hljs-keyword/);
    assert.match(html, /hljs-string/);
    assert.doesNotMatch(html, /<script>/);
    assert.deepEqual(rendered.features, { code: true, math: false });
  }
});
test("unknown code languages and oversized code remain readable text", async () => {
  const html = await enhanceContentHtml(
    render(
      '<pre><code class="language-unknown">&lt;button&gt;x&lt;/button&gt;</code></pre>',
      "html",
    ).html,
  );
  assert.match(html, /&lt;button&gt;x&lt;\/button&gt;/);
  assert.doesNotMatch(html, /hljs-/);
  const large = await enhanceContentHtml(
    render("```python\n" + "x".repeat(100001) + "\n```").html,
  );
  assert.doesNotMatch(large, /hljs-/);
});
test("formula errors, external resources and macros remain isolated", () => {
  assert.equal(renderFormula(String.raw`\frac{`, true).error, true);
  assert.equal(renderFormula("x".repeat(8001), false).error, true);
  const malicious = renderFormula(
    String.raw`\includegraphics{https://example.invalid/tracker} + \href{javascript:alert(1)}{x}`,
    true,
  );
  assert.doesNotMatch(malicious.html, /<img|<a |src=|href=/);
  renderFormula(String.raw`\gdef\sharedmacro{1}\sharedmacro`, false);
  assert.equal(renderFormula(String.raw`\sharedmacro`, false).error, true);
});
test("source snippets protect literal fences, tags and formula attributes", () => {
  const code = featureSource(
    "code",
    { source: "```\n<script>", language: "html", display: true },
    "markdown",
  );
  assert.match(code, /^````xml\n/);
  const formula = featureSource(
    "math",
    { source: 'x\" onmouseover="bad', language: "plaintext", display: false },
    "html",
  );
  assert.match(formula, /&quot;/);
  const nodes = DomUtils.findAll(
    () => true,
    parseDocument(render(formula, "html").html).children,
  );
  assert.equal(
    nodes.some((node) => "onmouseover" in node.attribs),
    false,
  );
});
test("local visual math does not add nodes to the persisted shared schema", () => {
  const source =
    '<p>前文 <span data-math="inline" data-latex="x^2">x^2</span> 后文</p>';
  assert.equal(sourceDocument(source).content?.[0].type, "rawHtml");
  assert.equal(
    htmlRichSource(source).content?.[0].content?.[1].type,
    "inlineMath",
  );
  assert.equal(renderRichNode(sourceDocument(source)), source);
});
test("visual formula and code edits preserve surrounding Markdown source", () => {
  const schema = getSchema(richExtensions(false, true));
  const source =
    "## 原有标题\n\n行内 $x^2$。\n\n```python\nprint(1)\n```\n\n末尾原文\n";
  const before = schema.nodeFromJSON(markdownRichSource(source));
  const after = schema.nodeFromJSON(
    markdownRichSource(source.replace("x^2", "x^3")),
  );
  assert.equal(
    patchVisualMarkdown(source, before, after),
    source.replace("x^2", "x^3"),
  );
  const changed = schema.nodeFromJSON(
    markdownRichSource(source.replace("print(1)", "print(2)")),
  );
  assert.equal(
    patchVisualMarkdown(source, before, changed),
    source.replace("print(1)", "print(2)"),
  );
});
test("HTML formula edits retain old whitespace and attributes outside the element", () => {
  const source =
    '<H2>旧标题</H2>\n\n<p>保留 &amp; 空格</p>\n<div data-math="block" data-latex="x^2">x^2</div>\n';
  const before = renderRichNode(htmlRichSource(source));
  const after = renderRichNode(htmlRichSource(source.replaceAll("x^2", "x^3")));
  assert.equal(
    patchVisualHtml(source, before, after),
    source.replaceAll("x^2", "x^3"),
  );
});
test("math CSS/fonts are local, versioned and use nonblocking swap", async () => {
  const css = await readFile(
    "public/content-features/katex-0.19.1/katex.min.css",
    "utf8",
  );
  assert.match(css, /font-display:swap/);
  assert.doesNotMatch(css, /https?:\/\/|\.ttf|\.woff\)/);
  for (const [, file] of css.matchAll(/url\((fonts\/[^)]+\.woff2)\)/g))
    assert.ok(
      (await readFile("public/content-features/katex-0.19.1/" + file))
        .byteLength,
    );
});
