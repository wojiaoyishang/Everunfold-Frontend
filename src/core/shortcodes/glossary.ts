import { DomUtils, parseDocument } from "htmlparser2";
import type { PublicShortcode } from "@/core/contracts/settings";

export const glossaryPopupName = "glossary-popup";
export const glossaryPopupAttribute = "data-glossary-popup";
export const glossaryPopupData = "data-glossary-popups";
export const glossaryTriggerSelector = `[${glossaryPopupAttribute}]`;

export const glossaryShortcode: PublicShortcode = {
  id: "aa15746c-70b7-43f3-b9e1-c6e533fb01ec",
  name: "glossary",
  title: "术语弹窗",
  description: "标记一段正文，绑定已发布词条或填写这处文字的说明。",
  kind: "container",
  parameters: [
    { name: "term", label: "词条路径片段", type: "text" },
    { name: "title", label: "弹窗标题", type: "text" },
    { name: "text", label: "纯文本说明", type: "text" },
  ],
  html: "<span>{{content}}</span>",
  css: "",
  scope: "ef-sc-aa15746c70b743f3b9e1c6e533fb01ec",
  revision: 1,
};

export type GlossaryPopup =
  | { kind: "term"; slug: string }
  | { kind: "text"; title: string; text: string }
  | { kind: "markup"; title: string; html: string };

const blockTag =
  /<\/?(?:address|article|aside|blockquote|details|div|dl|figure|footer|h[1-6]|header|hr|li|ol|p|pre|section|table|ul)\b/i;

/** A Markdown paragraph can be an inline trigger between its surrounding words. */
export function glossaryTriggerMarkup(html: string, markdown: boolean) {
  const nodes = parseDocument(html.trim()).children;
  const paragraph = nodes.length === 1 && nodes[0];
  const content =
    markdown && paragraph && paragraph.type === "tag" && paragraph.name === "p"
      ? DomUtils.getInnerHTML(paragraph)
      : html.trim();
  return { content, inline: !blockTag.test(content) };
}

export function validGlossarySlug(slug: string) {
  return (
    slug !== "." &&
    slug !== ".." &&
    Array.from(slug).length <= 120 &&
    /^[^\s/?#%<>\\\u0000-\u001f\u007f]+$/u.test(slug)
  );
}
