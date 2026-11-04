import type { JSONContent } from "@tiptap/core";
import { sourceDocument } from "./rich-text";

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
    ["listItem", "tableCell", "tableHeader", "blockquote"].includes(
      node.type ?? "",
    )
  ) {
    const blocks: JSONContent[] = [];
    let inline: JSONContent[] = [];
    const flush = () => {
      if (inline.length) blocks.push({ type: "paragraph", content: inline });
      inline = [];
    };
    for (const child of content) {
      if (
        ["text", "hardBreak", "inlineMath"].includes(child.type ?? "") ||
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
    ["listItem", "tableCell", "tableHeader", "blockquote"].includes(
      node.type ?? "",
    )
  )
    content = [{ type: "paragraph" }];
  return content ? { ...node, content } : node;
}

export function htmlRichSource(source: string, inlineImages = false) {
  return normalizeVisualDocument(sourceDocument(source, true), inlineImages);
}
