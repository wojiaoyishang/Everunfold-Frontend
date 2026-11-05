import assert from "node:assert/strict";
import test from "node:test";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { htmlRichSource } from "../src/core/editor/visual-document";
import { renderRichNode } from "../src/core/editor/rich-text";
import { patchVisualHtml } from "../src/core/editor/patch-visual-html";

const schema = getSchema(richExtensions(false));
test("source-authored custom HTML remains visually editable without rewriting wrappers", () => {
  const source = `<section class='callout' data-extra="keep">\r\n  <h2 id='title'>标题</h2>\r\n  <p class="copy" style="letter-spacing:1px">原样 &amp; <span class='accent' data-x='1'>改这里</span></p>\r\n</section>\r\n`;
  const doc = schema.nodeFromJSON(htmlRichSource(source));
  doc.check();
  assert.doesNotMatch(JSON.stringify(doc.toJSON()), /rawHtml/);
  let position = 0;
  doc.descendants((node, at) => {
    if (node.text === "改这里") position = at;
  });
  const state = EditorState.create({ schema, doc });
  const transaction = state.tr.insertText("已修改", position, position + 3);
  const updated = patchVisualHtml(
    source,
    renderRichNode(doc.toJSON()),
    renderRichNode(transaction.doc.toJSON()),
  );
  assert.equal(updated, source.replace("改这里", "已修改"));
  const bold = transaction.addMark(
    position,
    position + 3,
    schema.marks.bold.create(),
  );
  assert.equal(
    patchVisualHtml(
      source,
      renderRichNode(doc.toJSON()),
      renderRichNode(bold.doc.toJSON()),
    ),
    source.replace("改这里", "<strong>已修改</strong>"),
  );
});

test("opaque leaves do not lock editable siblings or execute their attributes", () => {
  const source = `<div class="layout"><!-- keep --><p onclick="alert(1)">可修改</p><script>alert(2)</script><x-card data-a='b'>卡片</x-card></div>`;
  const doc = schema.nodeFromJSON(htmlRichSource(source));
  doc.check();
  const before = renderRichNode(doc.toJSON());
  const after = before.replace("可修改", "已经修改");
  assert.equal(
    patchVisualHtml(source, before, after),
    source.replace("可修改", "已经修改"),
  );
  assert.equal(patchVisualHtml(source, before, before), source);
});
