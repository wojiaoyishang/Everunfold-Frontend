import assert from "node:assert/strict";
import test from "node:test";
import {
  hasUploadMarkers,
  replaceUploadMarker,
  uploadMarker,
  uploadMarkers,
} from "../src/core/editor/upload-placeholders";
import { htmlElementSelection } from "../src/core/editor/html-element-selection";
import { EditorState } from "@codemirror/state";
import { getSchema } from "@tiptap/core";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { sourceDocument, renderRichNode } from "../src/core/editor/rich-text";
import { htmlRichSource } from "../src/core/editor/visual-document";
import { patchVisualHtml } from "../src/core/editor/patch-visual-html";
import { richSourceSelection } from "../src/core/editor/source-positions";
import {
  markdownRichSource,
  patchVisualMarkdown,
  richMarkdownSelection,
} from "../src/core/editor/visual-markdown";
import {
  applySourceChanges,
  normalizedSourceOffset,
  rawSourceOffset,
  sourceSplice,
} from "../src/core/editor/source-lines";
import {
  blockSourcePatches,
  bufferBlockSource,
  withBlockSources,
} from "../src/core/content-management/block-sources";

const schema = getSchema(richExtensions(false));

test("HTML patches preserve raw spelling, mixed quoting, entities, and surrounding whitespace", () => {
  const raw = "<P>开头 &amp; 原样</P>\r\n\r\n<p><b>原样</b>  结束</p>\r\n";
  const base = "<p>开头 &amp; 原样</p><p><strong>原样</strong>  结束</p>";
  assert.equal(patchVisualHtml(raw, base, base), raw);
  assert.equal(
    patchVisualHtml(raw, base, base.replace("结束", "更新")),
    raw.replace("结束", "更新"),
  );
  assert.equal(
    patchVisualHtml(raw, base, base.replace("开头", "<em>开头</em>")),
    raw.replace("开头", "<em>开头</em>"),
  );
  const doc = schema.nodeFromJSON(sourceDocument(raw));
  const second = doc.child(0).nodeSize + 1;
  const mapped = richSourceSelection(doc, raw, {
    start: second,
    end: second + 2,
  })!;
  assert.equal(mapped.start, raw.lastIndexOf("原样"));
  assert.equal(raw.slice(mapped.start, mapped.end), "原样");
  assert.deepEqual(richSourceSelection(doc, raw, mapped, true), {
    start: second,
    end: second + 2,
  });
});

test("Markdown visual typing patches a repeated occurrence and preserves Markdown spelling", () => {
  const raw =
    "## 标题\n\n第一处 __重复__ &amp; 两个空格  \n继续\n\n第二处 重复。\n";
  const md = (source: string) =>
    schema.nodeFromJSON(markdownRichSource(source));
  const before = md(raw);
  const edited = raw.replace("第二处 重复。", "第二处 重复！");
  assert.equal(patchVisualMarkdown(raw, before, md(edited)), edited);
  const styled = raw.replace("第二处 重复。", "第二处 **重复**。");
  assert.equal(patchVisualMarkdown(raw, before, md(styled)), styled);
  const at = raw.lastIndexOf("重复");
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
});

test("code-editor positions and partial changes retain mixed original newline sequences", () => {
  const raw = "甲\r\n乙\n😀丙\r\n丁";
  const state = EditorState.create({ doc: raw });
  const offset = raw.indexOf("😀");
  assert.equal(
    rawSourceOffset(raw, normalizedSourceOffset(raw, offset)),
    offset,
  );
  const first = state.doc.line(2).from,
    last = state.doc.line(4).from;
  const changes = state.changes([
    { from: first, to: first + 1, insert: "变" },
    { from: last, to: last + 1, insert: "末" },
  ]);
  assert.equal(applySourceChanges(raw, changes), "甲\r\n变\n😀丙\r\n末");
  assert.deepEqual(sourceSplice("😀 tail", "😄 tail"), {
    from: 0,
    to: 2,
    insert: "😄",
  });
});

test("buffered patches use the actual initial editor source even after later shared input", async () => {
  const id = crypto.randomUUID();
  const shared = {
    body: [{ id, type: "html" as const, content: "shared latest" }],
  };
  const first = bufferBlockSource({}, shared.body[0], "first", "initial view");
  const second = bufferBlockSource(first, shared.body[0], "second", "first");
  assert.equal(shared.body[0].content, "shared latest");
  assert.equal(withBlockSources(shared, second).body[0].content, "second");
  const patch = (await blockSourcePatches(second))[0];
  assert.equal(patch.base_hash, (await blockSourcePatches(first))[0].base_hash);
  assert.notEqual(
    patch.base_hash,
    (
      await blockSourcePatches(
        bufferBlockSource({}, shared.body[0], "second", "shared latest"),
      )
    )[0].base_hash,
  );
});

test("HTML source selection includes complete tags and sibling elements", () => {
  const source = "<p>正文 <b>选中</b> 结尾</p>\n<p>下一段</p>";
  const start = source.indexOf("选中");
  const inline = htmlElementSelection(source, { start, end: start + 2 });
  assert.equal(source.slice(inline.start, inline.end), "<b>选中</b>");
  const paragraph = htmlElementSelection(source, {
    start: source.indexOf("正文"),
    end: start + 2,
  });
  assert.equal(
    source.slice(paragraph.start, paragraph.end),
    "<p>正文 <b>选中</b> 结尾</p>",
  );
  const siblings = htmlElementSelection(source, {
    start,
    end: source.indexOf("下一段") + 3,
  });
  assert.equal(source.slice(siblings.start, siblings.end), source);
  const caret = htmlElementSelection(source, { start, end: start });
  assert.deepEqual(caret, inline);
  const image =
    '<figure><img src="image.png"><figcaption>说明</figcaption></figure>';
  const imgAt = image.indexOf("<img");
  const picked = htmlElementSelection(image, {
    start: imgAt,
    end: imgAt + '<img src="image.png">'.length,
  });
  assert.equal(image.slice(picked.start, picked.end), '<img src="image.png">');
});

test("Markdown image alignment is represented in the source paragraph", () => {
  const imageSchema = getSchema(richExtensions(false, true));
  const source =
    "## 图片\n\n![说明](https://example.com/a.png)\n\n后面原样。\n";
  const before = imageSchema.nodeFromJSON(markdownRichSource(source));
  const value = structuredClone(before.toJSON());
  value.content[1].attrs.textAlign = "right";
  const after = imageSchema.nodeFromJSON(value);
  const result = patchVisualMarkdown(source, before, after);
  assert.ok(result);
  assert.match(
    result,
    /<p style="text-align:right"><img src="https:\/\/example.com\/a.png" alt="说明"><\/p>/,
  );
  assert.ok(result.startsWith("## 图片\n\n"));
  assert.ok(result.endsWith("\n后面原样。\n"));
});

test("Markdown visual lists and blockquotes import as schema-valid block content", () => {
  const md = (source: string) =>
    schema.nodeFromJSON(markdownRichSource(source));
  const raw = "前一段原样。\n\n目标段落\n\n后一段原样。\n";
  const before = md(raw);
  for (const inserted of ["- 目标段落", "1. 目标段落", "> 目标段落"]) {
    const expected = raw.replace("目标段落", inserted);
    const after = md(expected);
    after.check();
    assert.equal(patchVisualMarkdown(raw, before, after), expected);
  }
});

test("HTML cells and compact lists import as editable blocks while source patches preserve layout", () => {
  const raw =
    "<p>前文</p>\r\n<table>\n<tbody>\n<tr><th>标题</th><td>单元格 &amp; 文本</td><td></td></tr>\n</tbody>\n</table>\r\n";
  const doc = schema.nodeFromJSON(htmlRichSource(raw));
  doc.check();
  const before = renderRichNode(doc.toJSON());
  assert.equal(patchVisualHtml(raw, before, before), raw);
  assert.equal(
    patchVisualHtml(raw, before, before.replace("单元格", "已修改")),
    raw.replace("单元格", "已修改"),
  );
  for (const source of [
    "<ul>\n<li>第一项</li><li></li>\n</ul>",
    "<blockquote>直接引用文字</blockquote>",
  ])
    schema.nodeFromJSON(htmlRichSource(source)).check();
});

test("table merges and splits preserve the surrounding source with implicit cell paragraphs", () => {
  const prefix = "<P>原文 &amp;  空白</P>\r\n\r\n",
    suffix = "\r\n<p>后文</p>\r\n";
  const raw =
    prefix + "<table><tr><td>甲</td><td>乙</td></tr></table>" + suffix;
  const normalize = (html: string) => renderRichNode(htmlRichSource(html));
  const merged = normalize(raw).replace(
    "<td><p>甲</p></td><td><p>乙</p></td>",
    '<td colspan="2"><p>甲</p><p>乙</p></td>',
  );
  const result = patchVisualHtml(raw, normalize(raw), merged);
  assert.ok(result);
  assert.ok(result.startsWith(prefix));
  assert.ok(result.endsWith(suffix));
  assert.equal(normalize(result), merged);
  const split = merged.replace(
    '<td colspan="2"><p>甲</p><p>乙</p></td>',
    "<td><p>甲</p><p>乙</p></td><td><p></p></td>",
  );
  const restored = patchVisualHtml(result, merged, split);
  assert.ok(restored);
  assert.equal(normalize(restored), split);
  assert.ok(restored.startsWith(prefix));
  assert.ok(restored.endsWith(suffix));
});

test("visual Enter creates independent HTML lines using the surrounding newline and indentation", () => {
  assert.equal(
    patchVisualHtml("<p>甲乙</p>", "<p>甲乙</p>", "<p>甲</p><p>乙</p>"),
    "<p>甲</p>\n<p>乙</p>",
  );
  const raw = "<P>旧 &amp; 原样</P>\r\n  <p>甲</p>";
  assert.equal(
    patchVisualHtml(
      raw,
      "<p>旧 &amp; 原样</p><p>甲</p>",
      "<p>旧 &amp; 原样</p><p>甲</p><p>乙</p>",
    ),
    raw + "\r\n  <p>乙</p>",
  );
});

test("new HTML containers receive lines while inline marks and preformatted text retain whitespace", () => {
  const source = "<p>原文</p>";
  const inserted = "<blockquote><p>引用</p></blockquote>";
  assert.equal(
    patchVisualHtml(source, source, source + inserted),
    "<p>原文</p>\n<blockquote>\n  <p>引用</p>\n</blockquote>",
  );
  assert.equal(
    patchVisualHtml("", "<p></p>", "<p>甲</p><p>乙</p>"),
    "<p>甲</p>\n<p>乙</p>",
  );
  assert.equal(
    patchVisualHtml(source, source, "<p><strong>原文</strong></p>"),
    "<p><strong>原文</strong></p>",
  );
  const code = "<pre><code>  a\n    b</code></pre>";
  assert.equal(
    patchVisualHtml(source, source, source + code),
    source + "\n" + code,
  );
  const list = "<ul><li><p>甲</p></li></ul>";
  assert.equal(
    patchVisualHtml(
      list,
      list,
      "<ul><li><p>甲</p></li><li><p>乙</p></li></ul>",
    ),
    "<ul><li><p>甲</p></li>\n  <li>\n    <p>乙</p>\n  </li>\n</ul>",
  );
});

test("upload placeholders replace independently without replacing user edits", () => {
  const first = crypto.randomUUID(),
    second = crypto.randomUUID();
  const a = uploadMarker(first, 'a "quoted".png');
  const b = uploadMarker(second, "b.png");
  let source = "<p>原文</p>\n" + a + "\n" + b + "\n<p>上传期间继续输入</p>";
  assert.equal(uploadMarkers(source).length, 2);
  source = replaceUploadMarker(
    source,
    second,
    '<img src="site://media/00000000-0000-4000-8000-000000000001">',
  );
  source = replaceUploadMarker(
    source,
    first,
    '<img src="site://media/00000000-0000-4000-8000-000000000002">',
  );
  assert.ok(source.endsWith("<p>上传期间继续输入</p>"));
  assert.equal(uploadMarkers(source).length, 0);
  assert.equal(
    hasUploadMarkers([{ id: crypto.randomUUID(), type: "html", content: a }]),
    true,
  );
  assert.equal(
    uploadMarkers('&lt;img src="everunfold-upload://example"&gt;').length,
    0,
  );
  assert.equal(
    replaceUploadMarker("用户已删除占位", first, "完成"),
    "用户已删除占位",
  );
});
