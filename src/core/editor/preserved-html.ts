import type { JSONContent } from "@tiptap/core";
import { parseDocument, DomUtils } from "htmlparser2";
import { sourceDocument } from "./rich-text";

type HtmlNode = ReturnType<typeof parseDocument>["children"][number];
const blocks: Record<string, string> = {
  p: "paragraph",
  blockquote: "blockquote",
  ul: "bulletList",
  ol: "orderedList",
  li: "listItem",
  hr: "horizontalRule",
  br: "hardBreak",
  img: "image",
  table: "table",
  tr: "tableRow",
  td: "tableCell",
  th: "tableHeader",
};
const marks: Record<string, string> = {
  strong: "bold",
  b: "bold",
  em: "italic",
  i: "italic",
  s: "strike",
  del: "strike",
  u: "underline",
  code: "code",
  a: "link",
};
const inlineTags = new Set([
  "span",
  "abbr",
  "small",
  "sub",
  "sup",
  "kbd",
  "samp",
  "var",
  "time",
  "mark",
  "q",
  "cite",
  "label",
]);
const containers = new Set([
  "div",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "figure",
  "details",
  "dl",
]);
const opaque = new Set([
  "script",
  "style",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
  "template",
]);

/** Local visual projection only. The shared draft continues to store the original source. */
export function preservedHtmlDocument(source: string): JSONContent {
  const root = parseDocument(source, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const literal = (node: HtmlNode) =>
    source.slice(
      node.startIndex ?? 0,
      (node.endIndex ?? source.length - 1) + 1,
    );
  const convert = (node: HtmlNode): JSONContent[] => {
    if (node.type === "text")
      return node.data ? [{ type: "text", text: node.data }] : [];
    if (!("name" in node) || !("attribs" in node) || opaque.has(node.name))
      return [{ type: "htmlOpaque", attrs: { html: literal(node) } }];
    if (["thead", "tbody", "tfoot"].includes(node.name))
      return node.children.flatMap(convert);
    const strict = sourceDocument(literal(node), true);
    if (strict.content?.[0]?.type !== "rawHtml") {
      if (
        (marks[node.name] || inlineTags.has(node.name)) &&
        strict.content?.[0]?.type === "paragraph"
      )
        return strict.content[0].content ?? [];
      return strict.content ?? [];
    }
    const tag = node.name,
      props = node.attribs;
    const content = node.children.flatMap(convert);
    const attrs: Record<string, unknown> = { sourceAttrs: props };
    if (inlineTags.has(tag)) {
      return content.map((child) => {
        const existing = child.marks?.find(
          (mark) => mark.type === "preservedInline",
        );
        return {
          ...child,
          marks: [
            ...(child.marks ?? []).filter(
              (mark) => mark.type !== "preservedInline",
            ),
            {
              type: "preservedInline",
              attrs: {
                shells: [
                  { tag, sourceAttrs: props },
                  ...(existing?.attrs?.shells ?? []),
                ],
              },
            },
          ],
        };
      });
    }
    if (marks[tag]) {
      if (tag === "a") Object.assign(attrs, props);
      return content.map((child) => ({
        ...child,
        marks: [...(child.marks ?? []), { type: marks[tag], attrs }],
      }));
    }
    const heading = /^h([1-6])$/.exec(tag);
    const type = heading ? "heading" : blocks[tag];
    if (type) {
      if (heading) attrs.level = Number(heading[1]);
      const align =
        /(?:^|;)\s*text-align\s*:\s*(left|center|right|justify)\s*(?:;|$)/i.exec(
          props.style ?? "",
        )?.[1];
      if (align) attrs.textAlign = align.toLowerCase();
      for (const key of [
        "src",
        "alt",
        "title",
        "width",
        "height",
        "start",
        "colspan",
        "rowspan",
      ])
        if (key in props)
          attrs[key] = [
            "width",
            "height",
            "start",
            "colspan",
            "rowspan",
          ].includes(key)
            ? Number(props[key]) || null
            : props[key];
      return [{ type, attrs, ...(content.length ? { content } : {}) }];
    }
    if (tag === "pre") {
      const text = DomUtils.textContent(node);
      return [
        {
          type: "codeBlock",
          attrs,
          ...(text ? { content: [{ type: "text", text }] } : {}),
        },
      ];
    }
    const hasBlocks = content.some(
      (child) =>
        ![
          "text",
          "hardBreak",
          "image",
          "inlineMath",
          "htmlInline",
          "htmlOpaque",
        ].includes(child.type ?? ""),
    );
    return [
      {
        type:
          containers.has(tag) || hasBlocks ? "htmlContainer" : "htmlTextblock",
        attrs: { tag, sourceAttrs: props },
        content,
      },
    ];
  };
  return { type: "doc", content: root.children.flatMap(convert) };
}
