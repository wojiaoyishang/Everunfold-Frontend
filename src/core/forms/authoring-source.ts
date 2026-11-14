import MarkdownIt from "markdown-it";
import { parseDocument, DomUtils } from "htmlparser2";
import type { BuilderDocument, BuilderNode } from "@/core/builder/types";
import type { DraftFields } from "@/core/contracts/content-admin";
import { parseShortcodes } from "@/core/shortcodes/parser";
import { regionNames } from "@/core/shortcodes/region-definitions";

export const articleScene = "content.article.edit";
export const shuoshuoScene = "content.shuoshuo.edit";
export const pageScene = "pages.edit";
export const glossaryScene = "glossary.edit";
export const siteScene = "settings.site";

const markdown = new MarkdownIt({ html: true });
const protectedHeading = /{{<\s*\/?\s*(?:reply-only|password-area)(?![\w-])/i;
const regions = regionNames.map((name) => ({
  name,
  kind: "container" as const,
}));
const nonProseTags = new Set([
  "script",
  "style",
  "template",
  "iframe",
  "object",
  "svg",
  "noscript",
  "code",
  "pre",
  "head",
  "textarea",
  "input",
  "select",
  "meta",
]);

type Prose = { content: string; type?: string };

function passage(source: string, isMarkdown: boolean): string | null {
  if (protectedHeading.test(source)) {
    const { nodes } = parseShortcodes(source, regions, isMarkdown);
    let end = 0;
    let filtered = "";
    for (const node of nodes) {
      if (node.error) return null;
      filtered += source.slice(end, node.from);
      end = node.to;
    }
    source = filtered + source.slice(end);
    if (protectedHeading.test(source)) return null;
  }
  const html = isMarkdown ? markdown.render(source) : source;
  const tree = parseDocument(html);
  for (const element of DomUtils.findAll(
    (node) =>
      nonProseTags.has(node.name) ||
      "hidden" in node.attribs ||
      node.attribs["aria-hidden"] === "true",
    tree.children,
  )) {
    DomUtils.removeElement(element);
  }
  const prose = DomUtils.innerText(tree.children).trim().replace(/\s+/g, " ");
  return protectedHeading.test(prose) ? null : prose;
}

function pieces(nodes: readonly BuilderNode[]): Prose[] {
  return nodes.flatMap((node) => {
    const children = pieces(node.children ?? []);
    if (node.type === "core.heading" && typeof node.props.text === "string")
      return [{ type: "html", content: node.props.text }, ...children];
    if (
      !["core.markdown", "core.html", "core.shortcode"].includes(node.type) ||
      typeof node.props.source !== "string"
    )
      return children;
    return [
      {
        type: node.type === "core.markdown" ? "markdown" : "html",
        content: node.props.source,
      },
      ...children,
    ];
  });
}

export function authoringProse(
  blocks: readonly Prose[],
  document?: BuilderDocument | null,
) {
  let body = "";
  for (const block of document ? pieces(document.nodes) : blocks) {
    const type = block.type ?? "markdown";
    if (!["html", "markdown", "shortcode"].includes(type)) continue;
    const text = passage(block.content, type === "markdown");
    if (text === null) return undefined;
    if (text) body += (body ? "\n\n" : "") + text;
  }
  return Array.from(body).slice(0, 8_000).join("") || undefined;
}

export function draftAuthoringSource(
  fields: DraftFields,
  language: string,
  resourceId?: string,
) {
  const restricted =
    fields.settings?.visibility === "password" ||
    fields.settings?.captcha_read === "required";
  return {
    resourceId,
    language,
    title: fields.title ?? "",
    restricted,
    summary: restricted
      ? undefined
      : (passage(fields.excerpt ?? "", false) ?? undefined),
    body: restricted
      ? undefined
      : authoringProse(
          fields.body,
          fields.edit_mode === "components"
            ? (fields.component_document as BuilderDocument | null | undefined)
            : null,
        ),
  };
}
