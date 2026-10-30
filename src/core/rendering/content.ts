import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { DomUtils, parseDocument } from "htmlparser2";

import type { Content } from "@/core/content/types";
import { publicHref, resourceUrl } from "@/core/content/urls";
import { expandPresentationShortcodes } from "./shortcodes";

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

const markdown = new MarkdownIt({ html: true, linkify: true, breaks: true });
const defaultValidateLink = markdown.validateLink;
markdown.validateLink = (url: string) =>
  /^site:\/\/media\/[^\s]+$/.test(url) || defaultValidateLink(url);

const options: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "hr",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "blockquote",
    "pre",
    "code",
    "a",
    "img",
    "figure",
    "figcaption",
    "strong",
    "b",
    "em",
    "i",
    "s",
    "del",
    "u",
    "mark",
    "sup",
    "sub",
    "kbd",
    "abbr",
    "ul",
    "ol",
    "li",
    "dl",
    "dt",
    "dd",
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "div",
    "span",
    "details",
    "summary",
    "audio",
    "video",
    "source",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    code: ["class"],
    pre: ["class"],
    ol: ["start"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    h1: ["id"],
    h2: ["id"],
    h3: ["id"],
    h4: ["id"],
    h5: ["id"],
    h6: ["id"],
    details: ["open", "class"],
    div: ["class"],
    strong: ["class"],
    span: ["class", "title", "tabindex"],
    abbr: ["title"],
    audio: ["src", "controls", "preload"],
    video: ["src", "poster", "controls", "preload"],
    source: ["src", "type"],
  },
  allowedClasses: {
    details: [
      "legacy-collapse",
      /^tone-(indigo|green|red|orange|blue|black|grey)$/,
    ],
    div: [
      "legacy-alert",
      "legacy-collapse-body",
      /^tone-(indigo|green|red|orange|blue|black|grey)$/,
    ],
    strong: ["legacy-alert-title"],
    span: ["legacy-tooltip"],
    code: [/^language-[a-zA-Z0-9_-]+$/, "hljs"],
    pre: [/^language-[a-zA-Z0-9_-]+$/],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowProtocolRelative: false,
  nestingLimit: 100,
  disallowedTagsMode: "discard",
};

type ParsedNode = ReturnType<typeof parseDocument>["children"][number];

function mappedUrl(value: string, media: Content["media_urls"]): string | null {
  if (value.startsWith("site://media/")) {
    const entry = media[value.slice("site://media/".length)];
    return resourceUrl(entry?.webp) ?? resourceUrl(entry?.original);
  }
  return resourceUrl(value);
}

export function renderContent(content: Content): {
  html: string;
  toc: TableOfContentsItem[];
} {
  const toc: TableOfContentsItem[] = [];
  const seenHeadings = new Map<string, number>();
  const html = content.content
    .map((block) => {
      const expanded = expandPresentationShortcodes(block.content);
      const raw =
        block.type === "markdown" ? markdown.render(expanded) : expanded;
      // Permit the storage-only scheme in this intermediate tree, then resolve actual nodes.
      // Code text never participates in URL replacement.
      const clean = sanitizeHtml(raw, {
        ...options,
        allowedSchemes: ["http", "https", "mailto", "site"],
      });
      const document = parseDocument(clean);
      function visit(nodes: ParsedNode[]): void {
        for (const node of nodes) {
          if ("attribs" in node) {
            if (["img", "audio", "video", "source"].includes(node.name)) {
              const source = mappedUrl(
                node.attribs.src ?? "",
                content.media_urls,
              );
              if (source) node.attribs.src = source;
              else delete node.attribs.src;
              if (node.name === "img") {
                node.attribs.loading = "lazy";
                node.attribs.decoding = "async";
              } else if (["audio", "video"].includes(node.name)) {
                node.attribs.controls = "";
                node.attribs.preload = "none";
                if (node.attribs.poster) {
                  const poster = mappedUrl(
                    node.attribs.poster,
                    content.media_urls,
                  );
                  if (poster) node.attribs.poster = poster;
                  else delete node.attribs.poster;
                }
              }
            }
            if (node.name === "a") {
              const href = node.attribs.href?.startsWith("site://media/")
                ? mappedUrl(node.attribs.href, content.media_urls)
                : publicHref(node.attribs.href ?? "");
              if (href) node.attribs.href = href;
              else delete node.attribs.href;
              if (href?.startsWith("http")) {
                node.attribs.target = "_blank";
                node.attribs.rel = "noopener noreferrer";
              } else {
                delete node.attribs.target;
                delete node.attribs.rel;
              }
            }
            if (/^h[1-6]$/.test(node.name)) {
              const text = DomUtils.textContent(node).trim();
              const base = `heading-${
                text
                  .normalize("NFKC")
                  .toLocaleLowerCase()
                  .replace(/[^\p{L}\p{N}]+/gu, "-")
                  .replace(/^-|-$/g, "")
                  .slice(0, 80) || toc.length + 1
              }`;
              const count = (seenHeadings.get(base) ?? 0) + 1;
              seenHeadings.set(base, count);
              const id = count === 1 ? base : `${base}-${count}`;
              node.attribs.id = id;
              if (text) toc.push({ id, text, level: Number(node.name[1]) });
            }
          }
          if ("children" in node) visit(node.children);
        }
      }
      visit(document.children);
      return sanitizeHtml(DomUtils.getOuterHTML(document), options);
    })
    .join("\n");
  return { html, toc };
}
