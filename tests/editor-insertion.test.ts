import assert from "node:assert/strict";
import test from "node:test";
import { getSchema } from "@tiptap/core";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { htmlRichSource } from "../src/core/editor/visual-document";
import {
  markdownRichSource,
  patchVisualMarkdown,
  richMarkdownSelection,
} from "../src/core/editor/visual-markdown";
import { patchVisualHtml } from "../src/core/editor/patch-visual-html";
import { renderRichNode } from "../src/core/editor/rich-text";
import {
  renderContent,
  renderMarkdownSource,
} from "../src/core/rendering/content";
import { richSourceSelection } from "../src/core/editor/source-positions";
import { capturedSourceRange } from "../src/core/editor/captured-source-range";

const schema = getSchema(richExtensions(false, true));
const call = '{{< notice type="warning" >}}\n提示 **内容**。\n{{< /notice >}}';
const url = "site://media/00000000-0000-4000-8000-000000000001";

test("video image extension respects protected literals, escaped suffixes and link safety", () => {
  assert.match(
    renderMarkdownSource(`![片段](${url}){type=video}`),
    /<video[^>]*controls[^>]*preload="none"/,
  );
  assert.doesNotMatch(
    renderMarkdownSource(`\`![](${url}){type=video}\``),
    /<video/,
  );
  assert.doesNotMatch(
    renderMarkdownSource(`![](${url})\\{type=video}`),
    /<video/,
  );
  assert.doesNotMatch(
    renderMarkdownSource("![](javascript:alert(1)){type=video}"),
    /<video/,
  );
  assert.doesNotMatch(
    renderMarkdownSource("![普通](https://example.com/a.png)"),
    /<video/,
  );
  const html = renderContent({
    id: "video",
    content: [
      { id: "md", type: "markdown", content: `![](${url}){type=video}` },
    ],
    media_urls: {
      [url.slice(13)]: { original: "https://example.com/clip.mp4" },
    },
  }).html;
  assert.match(html, /<video[^>]*src="https:\/\/example.com\/clip.mp4"/);
  assert.doesNotMatch(html, /<img|type=video|site:\/\//);
});

test("native calls remain raw and editable surroundings retain source across visual transactions", () => {
  const raw = `<section class='keep'><p>开头 ${call} 末尾</p></section>\r\n`;
  const before = schema.nodeFromJSON(htmlRichSource(raw));
  assert.equal(before.child(0).child(0).child(1).type.name, "nativeShortcode");
  const edited = raw.replace("末尾", "更新");
  const after = schema.nodeFromJSON(htmlRichSource(edited));
  assert.equal(
    patchVisualHtml(
      raw,
      renderRichNode(before.toJSON()),
      renderRichNode(after.toJSON()),
    ),
    edited,
  );
  assert.ok(renderRichNode(after.toJSON()).includes(call));
  assert.doesNotMatch(renderRichNode(after.toJSON()), /&lt; notice/);
  const at = raw.indexOf(call);
  const mapped = richSourceSelection(
    before,
    raw,
    { start: at, end: at + call.length },
    true,
  )!;
  assert.deepEqual(richSourceSelection(before, raw, mapped), {
    start: at,
    end: at + call.length,
  });
});

test("Markdown video and shortcode visual edits serialize inside the original source block", () => {
  for (const raw of [
    `开头 ${call} 末尾\n`,
    `开头 ![](${url}){type=video} 末尾\n`,
  ]) {
    const before = schema.nodeFromJSON(markdownRichSource(raw));
    const after = schema.nodeFromJSON(
      markdownRichSource(raw.replace("末尾", "**更新**")),
    );
    const patched = patchVisualMarkdown(raw, before, after);
    assert.ok(patched);
    assert.equal(
      renderRichNode(markdownRichSource(patched)),
      renderRichNode(after.toJSON()),
    );
    assert.ok(patched.includes(raw.includes(call) ? call : "{type=video}"));
    const at = raw.indexOf("末尾");
    const mapped = richMarkdownSelection(
      before,
      raw,
      { start: at, end: at + 2 },
      true,
    )!;
    assert.deepEqual(richMarkdownSelection(before, raw, mapped), {
      start: at,
      end: at + 2,
    });
  }
});

test("HTML text color changes preserve custom containers, quoting and surrounding source", () => {
  const raw = "<section class='keep'><p>选择 颜色 结尾</p></section>\r\n";
  const before = renderRichNode(htmlRichSource(raw));
  const after = before.replace(
    "颜色",
    '<span style="color:#c0392b">颜色</span>',
  );
  const changed = patchVisualHtml(raw, before, after);
  assert.equal(
    changed,
    raw.replace("颜色", '<span style="color:#c0392b">颜色</span>'),
  );
  assert.equal(patchVisualHtml(changed!, after, before), raw);
});

test("an insertion range follows unrelated edits but cannot overwrite a changed selection", () => {
  assert.deepEqual(
    capturedSourceRange("abc 目标 xyz", "新增 abc 目标 xyz", {
      start: 4,
      end: 6,
    }),
    { start: 7, end: 9 },
  );
  assert.equal(
    capturedSourceRange("abc 目标 xyz", "abc 别的 xyz", { start: 4, end: 6 }),
    undefined,
  );
});
