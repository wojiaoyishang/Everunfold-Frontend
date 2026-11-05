import type { JSONContent } from "@tiptap/core";
import { sourceDocument } from "./rich-text";
import { preservedHtmlDocument } from "./preserved-html";

const containers = new Set([
  "doc",
  "blockquote",
  "bulletList",
  "orderedList",
  "listItem",
  "table",
  "tableRow",
  "tableHeader",
  "tableCell",
  "htmlContainer",
]);

/** Adapt HTML's inline cell/list content to the visual schema without rewriting its source. */
export function normalizeVisualDocument(
  node: JSONContent,
  inlineImages = false,
): JSONContent {
  let content = node.content?.map((part) =>
    normalizeVisualDocument(part, inlineImages),
  );
  if (content && containers.has(node.type ?? ""))
    content = content.filter(
      (part) => part.type !== "text" || part.text?.trim(),
    );
  if (
    content &&
    [
      "doc",
      "htmlContainer",
      "listItem",
      "tableCell",
      "tableHeader",
      "blockquote",
    ].includes(node.type ?? "")
  ) {
    const blocks: JSONContent[] = [];
    let inline: JSONContent[] = [];
    const flush = () => {
      if (inline.length) blocks.push({ type: "paragraph", content: inline });
      inline = [];
    };
    for (const child of content) {
      if (
        [
          "text",
          "hardBreak",
          "inlineMath",
          "htmlInline",
          "htmlOpaque",
        ].includes(child.type ?? "") ||
        (inlineImages && child.type === "image")
      )
        inline.push(child);
      else {
        flush();
        blocks.push(child);
      }
    }
    flush();
    content = blocks.length ? blocks : [{ type: "paragraph" }];
  }
  if (
    !content?.length &&
    [
      "doc",
      "htmlContainer",
      "listItem",
      "tableCell",
      "tableHeader",
      "blockquote",
    ].includes(node.type ?? "")
  )
    content = [{ type: "paragraph" }];
  return content ? { ...node, content } : node;
}

export function htmlRichSource(source: string, inlineImages = false) {
  const strict = sourceDocument(source, true);
  return normalizeVisualDocument(
    strict.content?.[0]?.type === "rawHtml"
      ? preservedHtmlDocument(source)
      : strict,
    inlineImages,
  );
}
