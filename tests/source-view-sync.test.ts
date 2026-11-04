import assert from "node:assert/strict";
import test from "node:test";
import { EditorState } from "@codemirror/state";
import { getSchema } from "@tiptap/core";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { sourceDocument } from "../src/core/editor/rich-text";
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
