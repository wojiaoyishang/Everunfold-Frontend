import { Node } from "@tiptap/core";

/** These are local source projections, never nodes in the shared collaboration schema. */
export const localEmbeddedNodes = [
  Node.create({
    name: "nativeShortcode",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: () => ({ source: { default: "" } }),
    parseHTML: () => [
      {
        tag: "span[data-editor-shortcode]",
        getAttrs: (el) => ({
          source: el.getAttribute("data-editor-shortcode"),
        }),
      },
    ],
    renderHTML: ({ node }) => [
      "span",
      {
        "data-editor-shortcode": node.attrs.source,
        contenteditable: "false",
        title: "短代码调用；可在源码中修改参数和正文",
      },
      String(node.attrs.source),
    ],
  }),
  Node.create({
    name: "localVideo",
    group: "inline",
    inline: true,
    atom: true,
    addAttributes: () => ({
      html: { default: "" },
      src: { default: "" },
      poster: { default: null },
      title: { default: null },
    }),
    parseHTML: () => [{ tag: "video[data-editor-video]" }],
    renderHTML: ({ node }) => [
      "video",
      {
        "data-editor-video": "",
        "data-media-source": node.attrs.src,
        controls: "",
        preload: "none",
        ...(node.attrs.title ? { title: node.attrs.title } : {}),
        ...(node.attrs.poster
          ? { "data-media-poster": node.attrs.poster }
          : {}),
      },
    ],
  }),
];
