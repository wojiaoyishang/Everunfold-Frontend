import { HighlightStyle } from "@codemirror/language";
import { tags } from "@lezer/highlight";

/** Theme variables keep source syntax readable in both admin color schemes. */
export const sourceHighlight = HighlightStyle.define([
  { tag: tags.heading, color: "var(--admin-accent)", fontWeight: "600" },
  {
    tag: [tags.keyword, tags.tagName, tags.attributeName, tags.operator],
    color: "var(--admin-syntax-keyword)",
  },
  {
    tag: [tags.string, tags.number, tags.bool, tags.special(tags.string)],
    color: "var(--admin-positive)",
  },
  { tag: [tags.comment, tags.meta], color: "var(--admin-muted)" },
  {
    tag: [tags.processingInstruction, tags.contentSeparator],
    color: "var(--admin-syntax-mark)",
  },
  {
    tag: [tags.link, tags.url],
    color: "var(--admin-accent)",
    textDecoration: "underline",
  },
  {
    tag: tags.strong,
    color: "var(--admin-syntax-keyword)",
    fontWeight: "600",
  },
  {
    tag: tags.emphasis,
    color: "var(--admin-syntax-emphasis)",
    fontStyle: "italic",
  },
  { tag: [tags.quote, tags.list], color: "var(--admin-syntax-quote)" },
  {
    tag: tags.monospace,
    color: "var(--admin-positive)",
    backgroundColor:
      "color-mix(in srgb, var(--admin-positive) 7%, transparent)",
    borderRadius: "3px",
  },
  { tag: tags.labelName, color: "var(--admin-syntax-emphasis)" },
  {
    tag: tags.strikethrough,
    color: "var(--admin-muted)",
    textDecoration: "line-through",
  },
  { tag: [tags.escape, tags.character], color: "var(--admin-syntax-emphasis)" },
]);
