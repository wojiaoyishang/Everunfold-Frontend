import { Extension, Mark, Node } from "@tiptap/core";
import type { DOMOutputSpec } from "@tiptap/pm/model";
import sanitizeHtml from "sanitize-html";
import { parseDocument } from "htmlparser2";

function visualAttributes(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object") return {};
  const attrs = Object.entries(value).filter(([key]) =>
    ["class", "style", "title", "lang", "dir"].includes(key),
  );
  const escaped = attrs
    .map(
      ([key, val]) =>
        ` ${key}="${String(val).replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;")}"`,
    )
    .join("");
  const safe = sanitizeHtml(`<div${escaped}></div>`, {
    allowedTags: ["div"],
    allowedAttributes: { div: ["class", "style", "title", "lang", "dir"] },
    allowedStyles: {
      "*": {
        color: [/^(?:#[\da-f]{3,8}|rgba?\([\d.,% ]+\)|[a-z]+)$/i],
        "background-color": [/^(?:#[\da-f]{3,8}|rgba?\([\d.,% ]+\)|[a-z]+)$/i],
        "text-align": [/^(left|center|right|justify)$/],
        "font-size": [/^\d+(?:\.\d+)?(?:px|em|rem|pt|%)$/],
        display: [/^(block|inline|inline-block|flex|grid)$/],
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        padding: [/^[\d.]+(?:px|em|rem|%)(?:\s+[\d.]+(?:px|em|rem|%)){0,3}$/],
        gap: [/^[\d.]+(?:px|em|rem)$/],
        "border-radius": [/^[\d.]+(?:px|em|rem|%)$/],
      },
    },
  });
  const node = parseDocument(safe).children[0];
  return node && "attribs" in node ? node.attribs : {};
}

export const PreservedHtmlAttributes = Extension.create({
  name: "preservedHtmlAttributes",
  addGlobalAttributes: () => [
    {
      types: [
        "paragraph",
        "heading",
        "blockquote",
        "bulletList",
        "orderedList",
        "listItem",
        "horizontalRule",
        "hardBreak",
        "image",
        "table",
        "tableRow",
        "tableCell",
        "tableHeader",
        "codeBlock",
        "bold",
        "italic",
        "strike",
        "underline",
        "code",
        "link",
        "textStyle",
      ],
      attributes: {
        sourceAttrs: {
          default: null,
          rendered: true,
          renderHTML: (attrs) => visualAttributes(attrs.sourceAttrs),
        },
      },
    },
  ],
});

export const preservedHtmlNodes = [
  ...(
    [
      ["htmlContainer", "block", "block+", "div"],
      ["htmlTextblock", "block", "inline*", "div"],
      ["htmlInline", "inline", "inline*", "span"],
    ] as const
  ).map(([name, group, content, element]) =>
    Node.create({
      name,
      group,
      content,
      inline: group === "inline",
      defining: true,
      addAttributes: () => ({
        tag: { default: element },
        sourceAttrs: { default: {} },
      }),
      parseHTML: () => [{ tag: `${element}[data-preserved-html="${name}"]` }],
      renderHTML: ({ node }) => [
        element,
        {
          ...visualAttributes(node.attrs.sourceAttrs),
          "data-preserved-html": name,
          "data-source-tag": node.attrs.tag,
        },
        0,
      ],
    }),
  ),
  Node.create({
    name: "htmlOpaque",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: () => ({ html: { default: "" } }),
    parseHTML: () => [{ tag: "span[data-preserved-opaque]" }],
    renderHTML: () => [
      "span",
      {
        "data-preserved-opaque": "",
        contenteditable: "false",
        title: "保留的非文本 HTML 节点",
      },
      "HTML",
    ],
  }),
  Mark.create({
    name: "preservedInline",
    priority: 1100,
    addAttributes: () => ({ shells: { default: [] } }),
    parseHTML: () => [{ tag: "span[data-preserved-inline]" }],
    renderHTML: ({ mark }) => {
      const shells = mark.attrs.shells as {
        tag: string;
        sourceAttrs: Record<string, string>;
      }[];
      return shells.reduceRight<DOMOutputSpec>(
        (inner, shell) => [
          "span",
          {
            ...visualAttributes(shell.sourceAttrs),
            "data-preserved-inline": "",
            "data-source-tag": shell.tag,
          },
          inner,
        ],
        ["span", {}, 0],
      );
    },
  }),
];
