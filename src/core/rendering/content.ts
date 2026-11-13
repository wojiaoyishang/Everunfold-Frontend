import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";
import { DomUtils, parseDocument } from "htmlparser2";

import type { Content } from "@/core/content/types";
import { publicHref, resourceUrl } from "@/core/content/urls";
import { renderNativeShortcodes } from "./native-shortcodes";
import type { PublicShortcode } from "@/core/contracts/settings";
import type { ShortcodeDiagnostic } from "@/core/shortcodes/parser";
import { fontFamily, referencedFontFaces } from "@/core/fonts/media";
import { markdownMath } from "./features/markdown-math";
import { markdownVideo } from "./features/markdown-video";
import { inspectContentFeatures } from "./features/content-features";
import type { ContentFeatures } from "./features/model";
import { codeHtml, parseCodeInfo } from "./features/code-options";
import { frameCodeHtml } from "./features/code-frame";
import { pluginRegistry } from "@/core/plugins/registry";
import { literalUnicodeEntities } from "./literal-unicode";

export interface TableOfContentsItem {
  id: string;
  text: string;
  level: number;
}

const markdown = new MarkdownIt({ html: true, linkify: true, breaks: true });
markdown.use(markdownMath);
markdown.use(markdownVideo);
markdown.renderer.rules.fence = (tokens, index, _options, env) => {
  const token = tokens[index],
    info = parseCodeInfo(token.info);
  return (
    codeHtml(
      env?.visualEditor ? token.content.replace(/\n$/, "") : token.content,
      info.language,
      info.options,
    ) + "\n"
  );
};
const defaultValidateLink = markdown.validateLink;
markdown.validateLink = (url: string) =>
  /^site:\/\/media\/[^\s]+$/.test(url) || defaultValidateLink(url);

export const renderMarkdownSource = (source: string, visualEditor = false) =>
  markdown.render(source, { visualEditor });
export const markdownSourceTokens = (source: string) =>
  markdown.parse(source, {});

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
    "section",
    "article",
    "aside",
    "header",
    "footer",
    "small",
    "time",
  ],
  allowedAttributes: {
    "*": [
      "class",
      "data-variant",
      "title",
      "aria-label",
      "role",
      "lang",
      "dir",
    ],
    time: ["datetime"],
    p: ["style"],
    figure: ["style"],
    a: ["href", "title", "target", "rel", "id", "class", "aria-label"],
    img: ["src", "alt", "title", "width", "height", "loading", "decoding"],
    code: ["class"],
    pre: ["class", "data-code"],
    ol: ["start"],
    th: ["colspan", "rowspan", "scope"],
    td: ["colspan", "rowspan"],
    h1: ["id", "style"],
    h2: ["id", "style"],
    h3: ["id", "style"],
    h4: ["id", "style"],
    h5: ["id", "style"],
    h6: ["id", "style"],
    details: ["open", "class"],
    div: [
      "class",
      "data-math",
      "data-latex",
      "data-shortcode-instance",
      "data-shortcode-region",
      "data-shortcode-region-kind",
    ],
    strong: ["class"],
    span: [
      "class",
      "title",
      "tabindex",
      "data-font",
      "style",
      "data-math",
      "data-latex",
    ],
    abbr: ["title"],
    audio: ["src", "controls", "preload"],
    video: ["src", "poster", "controls", "preload", "title"],
    source: ["src", "type"],
  },
  allowedClasses: {
    "*": [
      "ef-shortcode",
      "ef-shortcode-region",
      /^ef-sc-[a-f0-9]{32}(?:-[a-zA-Z_][a-zA-Z0-9_-]{0,63})?$/,
    ],
    code: [/^language-[a-zA-Z0-9_-]+$/, "hljs"],
    pre: [/^language-[a-zA-Z0-9_-]+$/],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedStyles: {
    "*": { "text-align": [/^(left|center|right|justify)$/] },
    span: {
      "font-family": [/^ef-font-[0-9a-f-]{36}$/],
      "font-size": [/^(?:[8-9]|[1-6][0-9]|7[0-2])px$/],
      color: [/^#[a-fA-F0-9]{6}$/],
    },
  },
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

export function renderContent(
  content: Pick<Content, "id" | "content" | "media_urls">,
  shortcodes: readonly PublicShortcode[] = [],
  rendering: {
    shortcodePreview?: boolean;
    disableShortcodeScripts?: boolean;
  } = {},
): {
  html: string;
  toc: TableOfContentsItem[];
  features: ContentFeatures;
  diagnostics: ShortcodeDiagnostic[];
} {
  // Packages can arrive after this module was imported, or be replaced/disabled.
  // Derive the allowlist from the same active registry as this render.
  const baseClasses = options.allowedClasses?.["*"];
  const sanitizeOptions: sanitizeHtml.IOptions = {
    ...options,
    allowedClasses: {
      ...options.allowedClasses,
      "*": [
        ...(Array.isArray(baseClasses) ? baseClasses : []),
        ...pluginRegistry.classNames,
      ],
    },
  };
  const toc: TableOfContentsItem[] = [];
  const seenHeadings = new Map<string, number>();
  const shortcodeStyles = new Set<string>();
  const scripts: Record<
    string,
    { javascript: string; title: string; css: string }
  > = {};
  let instancePrefix = "ef-shortcode-hole";
  while (
    content.content.some((block) => block.content.includes(instancePrefix))
  )
    instancePrefix += "x";
  const diagnostics: ShortcodeDiagnostic[] = [];
  const html = content.content
    .map((block, index) => {
      const expanded = renderNativeShortcodes(
        block.content,
        block.type === "markdown",
        shortcodes,
        block.type === "markdown" ? renderMarkdownSource : (source) => source,
        content.media_urls,
        rendering.shortcodePreview,
        `${instancePrefix}-${index}`,
      );
      const raw = expanded.html;
      if (!rendering.disableShortcodeScripts)
        Object.assign(scripts, Object.fromEntries(expanded.scripts));
      if (expanded.css) shortcodeStyles.add(expanded.css);
      diagnostics.push(...expanded.diagnostics);
      const media = {
        ...Object.fromEntries(
          Object.entries(expanded.mediaURLs).map(([id, original]) => [
            id,
            { original },
          ]),
        ),
        ...content.media_urls,
      };
      // Permit the storage-only scheme in this intermediate tree, then resolve actual nodes.
      // Code text never participates in URL replacement.
      const clean = sanitizeHtml(raw, {
        ...sanitizeOptions,
        allowedSchemes: ["http", "https", "mailto", "site"],
      });
      const document = parseDocument(clean);
      function visit(nodes: ParsedNode[]): void {
        for (const node of nodes) {
          if ("attribs" in node) {
            if (node.name === "span" && node.attribs["data-font"]) {
              const reference = node.attribs["data-font"];
              const id = reference.startsWith("site://media/")
                ? reference.slice(13)
                : "";
              const family = fontFamily(id);
              const style = (node.attribs.style ?? "")
                .replace(/(?:^|;)\s*font-family\s*:[^;]*/gi, "")
                .replace(/^;|;$/g, "");
              if (family && content.media_urls?.[id]?.font)
                node.attribs.style = [style, `font-family:${family}`]
                  .filter(Boolean)
                  .join(";");
              else {
                delete node.attribs["data-font"];
                if (style) node.attribs.style = style;
                else delete node.attribs.style;
              }
            }
            // Authored links must not impersonate heading or page-control IDs.
            if (node.name === "a") delete node.attribs.id;
            if (["img", "audio", "video", "source"].includes(node.name)) {
              const source = mappedUrl(node.attribs.src ?? "", media);
              if (source) node.attribs.src = source;
              else delete node.attribs.src;
              if (node.name === "img") {
                node.attribs.loading = "lazy";
                node.attribs.decoding = "async";
              } else if (["audio", "video"].includes(node.name)) {
                node.attribs.controls = "";
                node.attribs.preload = "none";
                if (node.attribs.poster) {
                  const poster = mappedUrl(node.attribs.poster, media);
                  if (poster) node.attribs.poster = poster;
                  else delete node.attribs.poster;
                }
              }
            }
            if (node.name === "a") {
              const href = node.attribs.href?.startsWith("site://media/")
                ? mappedUrl(node.attribs.href, media)
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
      return frameCodeHtml(
        sanitizeHtml(
          literalUnicodeEntities(DomUtils.getOuterHTML(document)),
          sanitizeOptions,
        ),
      );
    })
    .join("\n");
  const faces = referencedFontFaces(html, content.media_urls);
  return {
    html:
      (faces ? `<style data-content-fonts>${faces}</style>` : "") +
      (shortcodeStyles.size
        ? `<style data-shortcodes>${[...shortcodeStyles].join("\n")}</style>`
        : "") +
      html +
      (Object.keys(scripts).length
        ? `<script type="application/json" data-shortcode-scripts>${JSON.stringify(scripts).replaceAll("<", "\\u003c")}</script>`
        : ""),
    toc,
    features: inspectContentFeatures(html),
    diagnostics,
  };
}
