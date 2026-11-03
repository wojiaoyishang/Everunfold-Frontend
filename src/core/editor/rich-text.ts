import * as Y from "yjs";
import type { JSONContent } from "@tiptap/core";
import { yXmlFragmentToProsemirrorJSON } from "@tiptap/y-tiptap";
import { parseDocument } from "htmlparser2";

const tags: Record<string, string> = {
  p: "paragraph",
  blockquote: "blockquote",
  ul: "bulletList",
  ol: "orderedList",
  li: "listItem",
  pre: "codeBlock",
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
  span: "textStyle",
};
const attributes: Record<string, string[]> = {
  paragraph: ["textAlign"],
  heading: ["textAlign", "level"],
  orderedList: ["start", "type"],
  codeBlock: ["language"],
  image: ["src", "alt", "title", "width", "height", "caption", "alignment"],
  tableCell: ["colspan", "rowspan", "colwidth", "align"],
  tableHeader: ["colspan", "rowspan", "colwidth", "align"],
};
type HtmlNode = ReturnType<typeof parseDocument>["children"][number];

/** Conservative source import: preserve unsupported HTML as a source-editable atom. */
export function sourceDocument(source: string): JSONContent {
  try {
    const root = parseDocument(source);
    const convert = (
      nodes: HtmlNode[],
      inherited: NonNullable<JSONContent["marks"]> = [],
    ): JSONContent[] =>
      nodes.flatMap((node): JSONContent[] => {
        if (node.type === "text")
          return node.data
            ? [
                {
                  type: "text",
                  text: node.data,
                  ...(inherited.length ? { marks: inherited } : {}),
                },
              ]
            : [];
        if (!("name" in node) || !("attribs" in node))
          throw new Error("保留原始 HTML");
        const tag = node.name,
          props = node.attribs;
        if (
          ["thead", "tbody", "tfoot"].includes(tag) &&
          !Object.keys(props).length
        )
          return convert(node.children, inherited);
        const css = Object.fromEntries(
          (props.style ?? "")
            .split(";")
            .filter((v) => v.includes(":"))
            .map((v) => {
              const i = v.indexOf(":");
              return [
                v.slice(0, i).trim().toLowerCase(),
                v.slice(i + 1).trim(),
              ];
            }),
        );
        if (tag === "figure") {
          if (
            Object.keys(props).some((k) => k !== "style") ||
            Object.keys(css).some((k) => k !== "text-align")
          )
            throw new Error("自定义图片结构");
          const parts = node.children.filter(
            (n) => n.type !== "text" || n.data.trim(),
          );
          const images = parts.filter((n) => "name" in n && n.name === "img"),
            captions = parts.filter(
              (n) => "name" in n && n.name === "figcaption",
            );
          if (
            images.length !== 1 ||
            captions.length > 1 ||
            parts.length !== images.length + captions.length
          )
            throw new Error("自定义图片结构");
          const image = convert(images)[0];
          image.attrs ??= {};
          if (captions[0] && "children" in captions[0]) {
            if (captions[0].children.some((n) => n.type !== "text"))
              throw new Error("自定义图片说明");
            image.attrs.caption = captions[0].children
              .map((n) => (n.type === "text" ? n.data : ""))
              .join("");
          }
          if (css["text-align"]) image.attrs.alignment = css["text-align"];
          return [image];
        }
        if (marks[tag]) {
          const attrs: Record<string, unknown> = {};
          if (tag === "a") {
            if (
              Object.keys(props).some(
                (k) => !["href", "title", "rel", "target", "class"].includes(k),
              )
            )
              throw new Error("链接属性");
            Object.assign(attrs, props);
          } else if (tag === "span") {
            if (
              Object.keys(props).some(
                (k) => !["data-font", "style"].includes(k),
              ) ||
              Object.keys(css).some(
                (k) => !["font-size", "font-family", "color"].includes(k),
              )
            )
              throw new Error("自定义样式");
            if (props["data-font"])
              attrs.fontId = props["data-font"].replace(
                "site://media/",
                "media:",
              );
            if (css["font-family"] && !attrs.fontId)
              throw new Error("自定义字体");
            if (css["font-size"]) attrs.fontSize = css["font-size"];
            if (css.color) attrs.color = css.color;
          } else if (Object.keys(props).length) throw new Error("自定义属性");
          return convert(node.children, [
            ...inherited,
            { type: marks[tag], attrs },
          ]);
        }
        const heading = /^h([1-6])$/.exec(tag),
          type = heading ? "heading" : tags[tag];
        if (!type) throw new Error("自定义标签");
        const attrs: Record<string, unknown> = heading
          ? { level: Number(heading[1]) }
          : {};
        if (
          props.style &&
          ["paragraph", "heading"].includes(type) &&
          Object.keys(css).every((k) => k === "text-align")
        )
          attrs.textAlign = css["text-align"];
        else if (props.style) throw new Error("自定义样式");
        for (const [key, value] of Object.entries(props)) {
          if (key === "style") continue;
          if (!attributes[type]?.includes(key)) throw new Error("自定义属性");
          attrs[key] =
            ["start", "colspan", "rowspan", "width", "height"].includes(key) &&
            value
              ? Number(value)
              : value;
        }
        let children = node.children;
        if (
          [
            "bulletList",
            "orderedList",
            "table",
            "tableRow",
            "listItem",
          ].includes(type)
        )
          children = children.filter((n) => n.type !== "text" || n.data.trim());
        let content = convert(children, inherited);
        if (type === "codeBlock") {
          const text = content.map((n) => n.text ?? "").join("");
          content = text ? [{ type: "text", text }] : [];
        }
        return [{ type, attrs, ...(content.length ? { content } : {}) }];
      });
    let content = convert(
      root.children.filter((n) => n.type !== "text" || n.data.trim()),
    );
    if (content.some((n) => n.type === "text")) {
      if (content.some((n) => n.type !== "text" && n.type !== "hardBreak"))
        throw new Error("混合根节点");
      content = [{ type: "paragraph", content }];
    }
    const result = {
      type: "doc",
      content: content.length ? content : [{ type: "paragraph" }],
    };
    renderRichNode(result);
    return result;
  } catch {
    return {
      type: "doc",
      content: [{ type: "rawHtml", attrs: { html: source } }],
    };
  }
}

const escapeText = (s: unknown) =>
  String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
const escapeAttr = (s: unknown) =>
  escapeText(s).replaceAll('"', "&quot;").replaceAll("'", "&#x27;");
const attrsHtml = (attrs: Record<string, unknown>) =>
  Object.entries(attrs)
    .filter(([, v]) => v !== null && v !== undefined && v !== "")
    .map(([k, v]) => ` ${k}="${escapeAttr(v)}"`)
    .join("");
/** Stable HTML projection shared with the backend, independent of a live DOM/editor. */
export function renderRichNode(node: JSONContent): string {
  const type = node.type ?? "",
    attrs = node.attrs ?? {};
  if (type === "text") {
    let result = escapeText(node.text);
    for (const mark of [...(node.marks ?? [])]
      .sort((a, b) => a.type.localeCompare(b.type, "en"))
      .reverse()) {
      const props = mark.attrs ?? {},
        attributes: Record<string, unknown> = {};
      const tag = (
        {
          bold: "strong",
          italic: "em",
          strike: "s",
          underline: "u",
          code: "code",
          link: "a",
          textStyle: "span",
        } as Record<string, string>
      )[mark.type];
      if (!tag) throw new Error("未知文字格式");
      if (mark.type === "link")
        for (const key of ["href", "title", "target", "rel"])
          attributes[key] = props[key];
      if (mark.type === "textStyle") {
        const styles = [];
        if (props.fontId) {
          if (
            !/^media:[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(
              props.fontId,
            )
          )
            throw new Error("字体标识");
          attributes["data-font"] = props.fontId.replace(
            "media:",
            "site://media/",
          );
          styles.push("font-family:ef-font-" + props.fontId.slice(6));
        }
        if (props.fontSize) {
          if (!/^(?:[8-9]|[1-6][0-9]|7[0-2])px$/.test(props.fontSize))
            throw new Error("字号");
          styles.push("font-size:" + props.fontSize);
        }
        if (props.color) {
          if (!/^#[0-9a-fA-F]{6}$/.test(props.color))
            throw new Error("文字颜色");
          styles.push("color:" + props.color);
        }
        attributes.style = styles.join(";");
      }
      result = `<${tag}${attrsHtml(attributes)}>${result}</${tag}>`;
    }
    return result;
  }
  if (type === "rawHtml") return String(attrs.html ?? "");
  const content = (node.content ?? []).map(renderRichNode).join("");
  if (type === "doc") return content;
  if (type === "codeBlock")
    return `<pre><code${attrs.language ? attrsHtml({ class: "language-" + attrs.language }) : ""}>${content}</code></pre>`;
  const tag =
    type === "heading"
      ? `h${attrs.level ?? 2}`
      : Object.entries(tags).find(([, v]) => v === type)?.[0];
  if (!tag) throw new Error("未知正文结构");
  const values: Record<string, unknown> = {};
  if (attrs.textAlign) {
    if (!["left", "center", "right", "justify"].includes(attrs.textAlign))
      throw new Error("段落对齐");
    values.style = "text-align:" + attrs.textAlign;
  }
  for (const key of [
    "start",
    "src",
    "alt",
    "title",
    "width",
    "height",
    "colspan",
    "rowspan",
  ])
    if (
      key in attrs &&
      !(["start", "colspan", "rowspan"].includes(key) && attrs[key] === 1)
    )
      values[key] = attrs[key];
  if (type === "image" && (attrs.caption || attrs.alignment)) {
    if (
      attrs.alignment &&
      !["left", "center", "right"].includes(attrs.alignment)
    )
      throw new Error("图片对齐");
    return `<figure${attrs.alignment ? attrsHtml({ style: "text-align:" + attrs.alignment }) : ""}><img${attrsHtml(values)}>${attrs.caption ? `<figcaption>${escapeText(attrs.caption)}</figcaption>` : ""}</figure>`;
  }
  return (
    `<${tag}${attrsHtml(values)}>` +
    (["br", "hr", "img"].includes(tag) ? "" : content + `</${tag}>`)
  );
}

export function richDocument(fragment: Y.XmlFragment): JSONContent {
  return yXmlFragmentToProsemirrorJSON(fragment) as JSONContent;
}
export function richHtml(block: Y.Map<unknown>): string {
  if (
    block.get("type") !== "html" ||
    !(block.get("rich") instanceof Y.XmlFragment)
  )
    return String(block.get("content") ?? "");
  const html = renderRichNode(richDocument(block.get("rich") as Y.XmlFragment));
  return html === block.get("rich_base")
    ? String(block.get("content") ?? "")
    : html;
}
export function richFields(source: string) {
  const document = sourceDocument(source),
    fragment = new Y.XmlFragment();
  const xml = (node: JSONContent): Y.XmlElement | Y.XmlText => {
    if (node.type === "text") {
      const text = new Y.XmlText();
      text.applyDelta([
        {
          insert: node.text ?? "",
          attributes: Object.fromEntries(
            (node.marks ?? []).map((m) => [m.type, m.attrs ?? {}]),
          ),
        },
      ]);
      return text;
    }
    const element = new Y.XmlElement(node.type ?? "paragraph");
    for (const [key, value] of Object.entries(node.attrs ?? {}))
      if (value !== null) element.setAttribute(key, value as string);
    element.insert(0, (node.content ?? []).map(xml));
    return element;
  };
  fragment.insert(0, (document.content ?? []).map(xml));
  return { rich: fragment, rich_base: renderRichNode(document) };
}
