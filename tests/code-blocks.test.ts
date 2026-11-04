import assert from "node:assert/strict";
import test from "node:test";
import { DomUtils, parseDocument } from "htmlparser2";
import { getSchema } from "@tiptap/core";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderContent } from "../src/core/rendering/content";
import { enhanceContentHtml } from "../src/core/rendering/features/content-features";
import {
  codeHtml,
  codeOptions,
  validCodeMarks,
} from "../src/core/rendering/features/code-options";
import { featureSource } from "../src/core/editor/content-feature-source";
import { sourceCodeSnippet } from "../src/core/editor/code-snippet-selection";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { renderRichNode, sourceDocument } from "../src/core/editor/rich-text";
import { htmlRichSource } from "../src/core/editor/visual-document";
import {
  markdownRichSource,
  patchVisualMarkdown,
} from "../src/core/editor/visual-markdown";
import { patchVisualHtml } from "../src/core/editor/patch-visual-html";
import { ContentMarkup } from "../src/themes/argon/components/content-markup";
import { CodePreferencesProvider } from "../src/themes/argon/components/code-preferences";
const settings = {
  title: "main.py",
  numbers: "on",
  start: 10,
  mark: "11,13-14",
  wrap: "on",
  fold: 10,
} as const;
const render = (source: string, type: "markdown" | "html") =>
  renderContent({
    id: "code",
    media_urls: {},
    content: [{ id: "code", type, content: source }],
  });
const find = (
  html: string,
  predicate: Parameters<typeof DomUtils.findAll>[0],
) => DomUtils.findAll(predicate, parseDocument(html).children);

test("snippet metadata round trips through both source formats without storing generated markup", () => {
  for (const format of ["markdown", "html"] as const) {
    const source = featureSource(
      "code",
      {
        source: "answer = 42",
        language: "python",
        display: true,
        codeOptions: settings,
      },
      format,
    );
    const snippet = sourceCodeSnippet(
      source,
      { start: source.indexOf("42"), end: source.indexOf("42") + 2 },
      format,
    );
    assert.deepEqual(snippet?.initial.codeOptions, settings);
    assert.equal(snippet?.initial.source, "answer = 42");
    const [frame] = find(
      render(source, format).html,
      (node) => "data-code-frame" in node.attribs,
    );
    assert.equal(frame.attribs["data-numbers"], "on");
    assert.equal(frame.attribs["data-wrap"], "on");
    assert.match(DomUtils.textContent(frame), /main\.py/);
    assert.doesNotMatch(source, /code-line|data-code-frame|hljs-/);
  }
});
test("copy source retains tabs, CRLF, empty lines and final newline, independently of line markup", async () => {
  const source = '/* one\r\n\t two */\r\n\r\nconst answer = "你好";\r\n';
  const html = await enhanceContentHtml(
    render(codeHtml(source, "javascript", { start: 10, mark: "11,13" }), "html")
      .html,
  );
  const [frame] = find(html, (node) => "data-code-frame" in node.attribs);
  assert.equal(JSON.parse(frame.attribs["data-code-source"]), source);
  const rows = find(html, (node) =>
    (node.attribs.class ?? "").split(" ").includes("code-line"),
  );
  assert.deepEqual(
    rows.map((row) => row.attribs["data-line"]),
    ["10", "11", "12", "13"],
  );
  assert.deepEqual(
    rows
      .filter((row) => row.attribs.class.includes("marked"))
      .map((row) => row.attribs["data-line"]),
    ["11", "13"],
  );
  assert.equal(
    find(html, (node) => (node.attribs.class ?? "").includes("hljs-comment"))
      .length,
    2,
  );
});
test("metadata is bounded and author HTML cannot supply trusted reader controls or copy source", () => {
  assert.deepEqual(
    codeOptions({
      title: "x\ny",
      start: -1,
      numbers: "maybe",
      fold: 201,
      mark: "1-9999999",
      script: "bad",
    }),
    { title: "x y" },
  );
  assert.equal(validCodeMarks("4-2"), false);
  assert.equal(validCodeMarks("1,".repeat(100)), false);
  const html = render(
    '<pre data-code-source="forged" data-code-frame onclick="bad()"><code>&lt;script&gt;bad()&lt;/script&gt;</code></pre>',
    "html",
  ).html;
  const [frame] = find(html, (node) => "data-code-frame" in node.attribs);
  assert.equal(
    JSON.parse(frame.attribs["data-code-source"]),
    "<script>bad()</script>",
  );
  assert.equal(
    find(html, (node) => node.name === "script" || "onclick" in node.attribs)
      .length,
    0,
  );
});
test("local code attributes do not extend the persisted collaborative schema", () => {
  const source = codeHtml("answer = 42", "python", settings);
  const local = getSchema(richExtensions(false)).nodeFromJSON(
    htmlRichSource(source),
  );
  assert.deepEqual(local.firstChild?.attrs.codeOptions, settings);
  assert.equal(
    getSchema(richExtensions(true)).nodes.codeBlock.spec.attrs?.codeOptions,
    undefined,
  );
  assert.equal(renderRichNode(sourceDocument(source)), source);
});
test("visual code edits preserve metadata and surrounding HTML and Markdown spelling", () => {
  const schema = getSchema(richExtensions(false));
  for (const format of ["markdown", "html"] as const) {
    const beforeText =
      format === "html" ? "<P>before &amp; text</P>\n\n" : "before  text\n\n\n";
    const afterText = format === "html" ? "\n\n<p>after</p>" : "\n\n\nafter";
    const source =
      beforeText +
      featureSource(
        "code",
        {
          source: "answer = 42",
          language: "python",
          display: true,
          codeOptions: settings,
        },
        format,
      ) +
      afterText;
    const before = schema.nodeFromJSON(
      format === "html" ? htmlRichSource(source) : markdownRichSource(source),
    );
    const patch = (next: typeof before) =>
      format === "html"
        ? patchVisualHtml(
            source,
            renderRichNode(before.toJSON()),
            renderRichNode(next.toJSON()),
          )
        : patchVisualMarkdown(source, before, next);
    assert.equal(patch(before), source);
    const json = before.toJSON();
    json.content[1].content[0].text = "answer = 43";
    const changed = patch(schema.nodeFromJSON(json));
    assert.ok(changed, format);
    assert.ok(changed.startsWith(beforeText), format);
    assert.ok(changed.endsWith(afterText));
    assert.deepEqual(
      sourceCodeSnippet(
        changed,
        { start: changed.indexOf("43"), end: changed.indexOf("43") + 2 },
        format,
      )?.initial.codeOptions,
      settings,
    );
  }
});
test("source snippet selection edits the requested repeated fence and preserves trailing separators", () => {
  const block = featureSource(
    "code",
    { source: "print(42)", language: "python", display: true },
    "markdown",
  );
  const source = block + "\r\n\r\ntext\r\n\r\n" + block + "\r\n";
  const position = source.lastIndexOf("42");
  const snippet = sourceCodeSnippet(
    source,
    { start: position, end: position + 2 },
    "markdown",
  );
  assert.equal(snippet?.initial.source, "print(42)");
  assert.equal(snippet?.suffix, "\r\n");
  assert.equal(snippet?.range.start, source.lastIndexOf("```python"));
});
test("global code fonts and CSS are emitted only for bodies that use code", () => {
  const font = {
    font_media_id: "media:11111111-1111-1111-1111-111111111111",
    font_url: "/fonts/code.woff2",
    font_info: {
      family: "Code",
      format: "woff2",
      style: "normal",
      weight_min: 400,
      weight_max: 400,
    },
  } as const;
  for (const useCode of [false, true]) {
    const body = render(
      useCode ? "```js\nconst x = 1\n```" : "plain text",
      "markdown",
    );
    const html = renderToStaticMarkup(
      createElement(
        CodePreferencesProvider,
        { value: font },
        createElement(ContentMarkup, {
          html: body.html,
          features: body.features,
        }),
      ),
    );
    assert.equal(html.includes("data-code-font"), useCode);
    assert.equal(html.includes("/content-features/code-v2.css"), useCode);
    if (useCode) assert.match(html, /font-display:swap/);
  }
});
