import { Node, mergeAttributes, type Extensions } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { TableKit } from "@tiptap/extension-table";
import TextAlign from "@tiptap/extension-text-align";
import { TextStyle } from "@tiptap/extension-text-style";
import Image from "@tiptap/extension-image";
import {
  preservedHtmlNodes,
  PreservedHtmlAttributes,
} from "./preserved-html-extensions";
import { UPLOAD_SCHEME, uploadPlaceholderImage } from "./upload-placeholders";
import {
  localFormulaNodes,
  LocalCodeHighlight,
  LocalCodeOptions,
} from "./feature-extensions";

const RawHtml = Node.create({
  name: "rawHtml",
  group: "block",
  atom: true,
  selectable: true,
  addAttributes: () => ({ html: { default: "" } }),
  parseHTML: () => [
    {
      tag: "div[data-raw-html]",
      getAttrs: (node) => ({ html: node.getAttribute("data-raw-html") ?? "" }),
    },
  ],
  renderHTML: ({ node }) => [
    "div",
    { "data-raw-html": node.attrs.html },
    "自定义 HTML",
  ],
});
const RichTextStyle = TextStyle.extend({
  addAttributes: () => ({
    fontId: {
      default: null,
      parseHTML: (el) =>
        el.getAttribute("data-font")?.replace("site://media/", "media:") ??
        null,
      renderHTML: (attrs) =>
        attrs.fontId
          ? {
              "data-font": String(attrs.fontId).replace(
                "media:",
                "site://media/",
              ),
              style: "font-family:ef-font-" + String(attrs.fontId).slice(6),
            }
          : {},
    },
    fontSize: {
      default: null,
      parseHTML: (el) => el.style.fontSize || null,
      renderHTML: (attrs) =>
        attrs.fontSize ? { style: "font-size:" + attrs.fontSize } : {},
    },
    color: {
      default: null,
      parseHTML: (el) =>
        /^#[a-fA-F0-9]{6}$/.test(el.style.color) ? el.style.color : null,
      renderHTML: (attrs) =>
        attrs.color ? { style: "color:" + attrs.color } : {},
    },
  }),
});
export const RichImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
      caption: { default: null },
      alignment: { default: null },
    };
  },
  renderHTML: ({ HTMLAttributes }) => {
    const { caption, alignment, ...rest } = HTMLAttributes;
    const pending = String(rest.src).startsWith(UPLOAD_SCHEME);
    const image: [string, Record<string, unknown>] = [
      "img",
      mergeAttributes(rest, {
        "data-media-source": rest.src,
        ...(pending
          ? {
              src: uploadPlaceholderImage,
              "data-upload-placeholder": "",
              width: 360,
              height: 154,
            }
          : {}),
      }),
    ];
    return caption || alignment
      ? [
          "figure",
          {
            "data-editor-image": "",
            ...(alignment ? { style: "text-align:" + alignment } : {}),
          },
          image,
          ...(caption ? [["figcaption", {}, String(caption)]] : []),
        ]
      : image;
  },
});
export function richExtensions(
  shared: boolean,
  inlineImages = false,
): Extensions {
  return [
    StarterKit.configure({
      undoRedo: shared ? false : undefined,
      trailingNode: false,
      link: {
        openOnClick: false,
        autolink: false,
        protocols: ["site"],
        HTMLAttributes: { target: null, rel: null, class: null },
      },
    }),
    RichTextStyle,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
    TableKit.configure({ table: { resizable: false } }),
    RichImage.configure({ inline: inlineImages }),
    RawHtml,
    ...(!shared ? [PreservedHtmlAttributes, ...preservedHtmlNodes] : []),
    ...(!shared
      ? [...localFormulaNodes, LocalCodeHighlight, LocalCodeOptions]
      : []),
  ];
}
