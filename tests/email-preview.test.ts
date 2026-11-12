import assert from "node:assert/strict";
import test from "node:test";
import { getSchema } from "@tiptap/core";
import { EditorState } from "@tiptap/pm/state";
import { patchVisualHtml } from "../src/core/editor/patch-visual-html";
import { richExtensions } from "../src/core/editor/rich-extensions";
import { renderRichNode } from "../src/core/editor/rich-text";
import { htmlRichSource } from "../src/core/editor/visual-document";
import { renderEmailPreview } from "../src/core/notifications/email-preview";

test("visual editing keeps placeholders and untouched attributes in a nested email table", () => {
  const source = [
    '<table role="presentation" style="font-family:Arial,\'Microsoft YaHei\',sans-serif">',
    "  <tr><td>",
    '    <table role="presentation">',
    "      <tr><td>",
    '        <img src="{{site.icon_url}}" alt="" data-mail-optional="site.icon_url">',
    "        <strong>{{site.name}}</strong>",
    "      </td></tr>",
    '      <tr><td><p style="text-align:center;margin:0">请输入 {{verification.code}}</p></td></tr>',
    '      <tr><td><a href="{{site.support_url}}" data-mail-optional="site.support_url">帮助</a></td></tr>',
    "    </table>",
    "  </td></tr>",
    "</table>",
  ].join("\n");
  const schema = getSchema(richExtensions(false, false, true));
  const doc = schema.nodeFromJSON(htmlRichSource(source));
  const state = EditorState.create({ schema, doc });
  let at = 0;
  doc.descendants((node, position) => {
    if (node.text?.startsWith("请输入")) at = position;
  });
  assert.ok(at);
  const updated = state.tr.insertText("请填写", at, at + 3).doc;
  const html = patchVisualHtml(
    source,
    renderRichNode(doc.toJSON()),
    renderRichNode(updated.toJSON()),
    (value) =>
      renderRichNode(schema.nodeFromJSON(htmlRichSource(value)).toJSON()),
  );
  assert.equal(html, source.replace("请输入", "请填写"));
});

test("email preview renders the help link and omits the unconfigured icon", () => {
  const source = [
    '<table role="presentation"><tr><td style="color:{{site.accent_color}}">',
    "<p>Hello {{site.name}} &amp; guests</p>",
    '<img data-mail-optional="site.icon_url" src="{{site.icon_url}}">',
    '<a title="has href= in its title" data-mail-optional="site.support_url" href="{{site.support_url}}">Help</a>',
    "</td></tr></table>",
  ].join("\n");
  const values = {
    "site.name": "<My Blog>",
    "site.accent_color": "#345678",
    "site.support_url": "https://example.com/help?lang=en&theme=dark",
  };
  const document = renderEmailPreview(source, values);
  assert.match(document, /Hello &lt;My Blog&gt; &amp; guests/);
  assert.match(
    document,
    /href="https:\/\/example\.com\/help\?lang=en&amp;theme=dark"/,
  );
  assert.doesNotMatch(document, /<img\s/);
});

test("email preview strips executable content", () => {
  const document = renderEmailPreview(
    '<form><input></form><script>alert(1)</script><p onclick="alert(1)">{{actor.name}}</p><a href="javascript:alert(1)">Help</a>',
    { "actor.name": "<img src=x>" },
  );
  assert.doesNotMatch(document, /<(form|script)|onclick|javascript:/);
  assert.match(document, /&lt;img src=x&gt;/);
});
