import { DomUtils, parseDocument } from "htmlparser2";
import sanitizeHtml from "sanitize-html";
import { resourceUrl, publicHref } from "@/core/content/urls";
import { parseSiteMediaReference } from "@/core/media/references";
import { renderContent } from "@/core/rendering/content";
import { escapeMarkup } from "@/core/rendering/features/model";
import type { BuilderDocument, BuilderNode } from "./types";

type Media = Parameters<typeof renderContent>[0]["media_urls"];
type Shortcodes = Parameters<typeof renderContent>[1];

const field = (node: BuilderNode, key: string) =>
  typeof node.props[key] === "string" ? node.props[key] : "";

/** Static syndication uses public components only and omits interactive code, controls and private annotations. */
export function builderSyndicationHtml(
  document: BuilderDocument,
  media: Media,
  shortcodes?: Shortcodes,
): string {
  function render(nodes: BuilderNode[]): string {
    return nodes
      .map((node) => {
        const text = (key: string) => escapeMarkup(field(node, key));
        const image = (key: string, alt = "") => {
          const value = field(node, key);
          const id = parseSiteMediaReference(value);
          const src = resourceUrl(id ? media[id]?.original : value);
          return src ? `<img src="${escapeMarkup(src)}" alt="${alt}">` : "";
        };
        switch (node.type) {
          case "core.comment":
          case "core.comments":
            return "";
          case "core.markdown":
          case "core.html":
          case "core.shortcode":
            return renderContent(
              {
                id: node.id,
                content: [
                  {
                    id: node.id,
                    type: node.type === "core.html" ? "html" : "markdown",
                    content: field(node, "source"),
                  },
                ],
                media_urls: media,
              },
              shortcodes,
              { disableShortcodeScripts: true },
            ).html;
          case "core.heading": {
            const level = /^[2-6]$/.test(field(node, "level"))
              ? field(node, "level")
              : "2";
            return `<h${level}>${text("text")}</h${level}>`;
          }
          case "core.image":
            return `<figure>${image("source", text("alt"))}${text("caption") ? `<figcaption>${text("caption")}</figcaption>` : ""}</figure>`;
          case "core.banner":
            return `<h2>${text("title")}</h2>${image("image")}<p>${text("text")}</p>`;
          case "core.button": {
            const href = publicHref(field(node, "href"));
            return href
              ? `<p><a href="${escapeMarkup(href)}">${text("label")}</a></p>`
              : "";
          }
          case "core.divider":
            return "<hr>";
          default:
            return render(node.children ?? []);
        }
      })
      .join("");
  }
  return sanitizeHtml(render(document.nodes), {
    allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
    allowedAttributes: { a: ["href"], img: ["src", "alt"] },
    allowedSchemes: ["https", "http", "mailto"],
    nonTextTags: ["script", "style", "textarea", "option", "button", "iframe"],
  });
}

export function builderSearchText(
  document: BuilderDocument,
  media: Media,
  shortcodes?: Shortcodes,
) {
  return DomUtils.innerText(
    parseDocument(builderSyndicationHtml(document, media, shortcodes)),
  );
}
