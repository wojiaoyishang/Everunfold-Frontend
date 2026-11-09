import assert from "node:assert/strict";
import test from "node:test";
import * as Y from "yjs";
import { getSchema } from "@tiptap/core";
import { richExtensions } from "../src/core/editor/rich-extensions";
import {
  sourceDocument,
  renderRichNode,
  richHtml,
} from "../src/core/editor/rich-text";
import {
  createScratch,
  LOCAL,
  REMOTE,
  projectDocument,
} from "../src/core/collaboration/document";
import { renderContent } from "../src/core/rendering/content";
import { referencedFontFaces } from "../src/core/fonts/media";
import type { DraftFields, MediaURL } from "@/core/contracts/content-admin";

test("opening supported HTML preserves semantic output when ProseMirror adds default attributes", () => {
  const schema = getSchema(richExtensions(true));
  for (const source of [
    "<h2>标题😀</h2><p>正文 <strong>加粗</strong> 文字</p>",
    '<p><a href="https://example.com">链接</a></p>',
    "<ol><li><p>one</p></li></ol>",
    "<table><tr><td><p>cell</p></td></tr></table>",
    '<figure style="text-align:center"><img src="https://example.com/a.png" alt="图片" width="400"><figcaption>图片说明</figcaption></figure>',
  ]) {
    const parsed = sourceDocument(source);
    assert.equal(
      renderRichNode(schema.nodeFromJSON(parsed).toJSON()),
      renderRichNode(parsed),
    );
    const fields: DraftFields = {
      title: "",
      body: [{ id: crypto.randomUUID(), type: "html", content: source }],
    };
    assert.equal(
      projectDocument(createScratch(fields), fields).body[0].content,
      source,
    );
  }
});

test("custom HTML stays a lossless source atom and preview removes executable content", () => {
  const source =
    '<div class="custom"><script>alert(1)</script><x-card data-extra="1">原文</x-card></div>';
  assert.equal(sourceDocument(source).content?.[0].type, "rawHtml");
  assert.equal(renderRichNode(sourceDocument(source)), source);
  assert.doesNotMatch(
    renderContent({
      id: "proof",
      content: [{ id: "raw", type: "html", content: source }],
      media_urls: {},
    }).html,
    /<script|alert\(1\)/,
  );
});

test("unsupported inline styles stay in raw source rather than creating rejected rich updates", () => {
  for (const source of [
    '<p><span style="font-size:14pt;color:rgb(1,2,3)">粘贴内容</span></p>',
    '<p style="text-align:invalid">原始样式</p>',
  ]) {
    assert.equal(sourceDocument(source).content?.[0].type, "rawHtml");
    assert.equal(renderRichNode(sourceDocument(source)), source);
  }
});

test("two rich XML replicas converge and local undo leaves the peer text", () => {
  const id = crypto.randomUUID(),
    fields: DraftFields = {
      title: "",
      body: [{ id, type: "html", content: "<p>正文</p>" }],
    };
  const a = createScratch(fields),
    b = new Y.Doc();
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a), REMOTE);
  const undo = new Y.UndoManager(a.getMap("blocks"), {
    trackedOrigins: new Set([LOCAL]),
  });
  const text = (doc: Y.Doc) =>
    (
      (
        doc
          .getMap<Y.Map<unknown>>("blocks")
          .get(id)!
          .get("rich") as Y.XmlFragment
      ).get(0) as Y.XmlElement
    ).get(0) as Y.XmlText;
  a.transact(() => text(a).insert(0, "本人"), LOCAL);
  b.transact(() => text(b).insert(2, "远端😀"), LOCAL);
  Y.applyUpdate(a, Y.encodeStateAsUpdate(b), REMOTE);
  Y.applyUpdate(b, Y.encodeStateAsUpdate(a), REMOTE);
  assert.equal(
    richHtml(a.getMap<Y.Map<unknown>>("blocks").get(id)!),
    richHtml(b.getMap<Y.Map<unknown>>("blocks").get(id)!),
  );
  undo.undo();
  assert.match(projectDocument(a, fields).body[0].content, /远端😀/);
  assert.doesNotMatch(projectDocument(a, fields).body[0].content, /本人/);
});

test("font declarations contain only fonts actually used by the current content", () => {
  const one = "11111111-1111-1111-1111-111111111111",
    two = "22222222-2222-2222-2222-222222222222";
  const font = (name: string): MediaURL => ({
    original: `https://example.com/${name}.woff2`,
    font: {
      family: "Test",
      style: "normal",
      weight_min: 400,
      weight_max: 400,
      format: "woff2",
    },
  });
  const media = { [one]: font("used"), [two]: font("unused") };
  const source = `<p><span data-font="site://media/${one}" style="font-family:ef-font-${one};font-size:18px">只用一种</span></p>`;
  const html = renderContent({
    id: "one",
    content: [{ id: "body", type: "html", content: source }],
    media_urls: media,
  }).html;
  assert.match(html, /font-display:swap/);
  assert.match(html, /used\.woff2/);
  assert.doesNotMatch(html, /unused\.woff2/);
  assert.match(html, /font-size:18px/);
  assert.equal(referencedFontFaces("<p>没有引用字体</p>", media), "");
  assert.doesNotMatch(
    renderContent({
      id: "none",
      content: [{ id: "body", type: "html", content: "<p>系统字体</p>" }],
      media_urls: media,
    }).html,
    /@font-face|\.woff2/,
  );
});
