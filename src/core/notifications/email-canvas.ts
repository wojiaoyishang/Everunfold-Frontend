import { parseDocument } from "htmlparser2";
import sanitizeHtml from "sanitize-html";

const token = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}/g;
const dropped = new Set([
  "form",
  "iframe",
  "math",
  "object",
  "script",
  "style",
  "svg",
]);
const tableStructure = new Set(["table", "tbody", "tfoot", "thead", "tr"]);

type Range = { start: number; end: number };
type Replacement = Range & { value: string };
export type EmailEditTarget = {
  kind: "text" | "link" | "image";
  text?: string;
  textRange?: Range;
  url?: string;
  tagRange?: Range;
};
export type EmailCanvas = {
  document: string;
  targets: Map<string, EmailEditTarget>;
};

export function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sample(values: Record<string, string>, key: string) {
  return Object.hasOwn(values, key) ? (values[key] ?? "") : "";
}

export function interpolateEmail(
  value: string,
  values: Record<string, string>,
) {
  return value.replace(token, (_match, key: string) => sample(values, key));
}

function replaceRanges(source: string, replacements: Replacement[]) {
  let result = source;
  for (const { start, end, value } of replacements.sort(
    (a, b) => b.start - a.start,
  )) {
    result = result.slice(0, start) + value + result.slice(end);
  }
  return result;
}

function cleanMarkup(value: string) {
  return sanitizeHtml(value, {
    allowedTags: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "div",
      "em",
      "h1",
      "h2",
      "h3",
      "h4",
      "h5",
      "h6",
      "hr",
      "i",
      "img",
      "li",
      "ol",
      "p",
      "pre",
      "s",
      "span",
      "strong",
      "table",
      "tbody",
      "td",
      "tfoot",
      "th",
      "thead",
      "tr",
      "u",
      "ul",
    ],
    allowedAttributes: {
      "*": ["class", "style", "title", "data-mail-editor-id"],
      a: ["href", "rel", "target"],
      img: ["alt", "height", "src", "width"],
      table: ["border", "cellpadding", "cellspacing", "role", "width"],
      td: ["align", "colspan", "rowspan", "valign", "width"],
      th: ["align", "colspan", "rowspan", "valign", "width"],
    },
    allowedSchemes: ["http", "https", "mailto", "cid"],
    nonTextTags: [...dropped],
    parseStyleAttributes: false,
    transformTags: {
      "*": (tagName, attributes) => {
        const attribs = { ...attributes };
        for (const name of ["href", "src"]) {
          const value = attribs[name]?.trim();
          const allowed =
            name === "src"
              ? /^(https?:\/\/|\/|cid:)/i
              : /^(https?:\/\/|\/|mailto:)/i;
          if (value && !value.includes("\0") && allowed.test(value))
            attribs[name] = value;
          else delete attribs[name];
        }
        const style = attribs.style?.toLowerCase().replaceAll(" ", "");
        if (style?.includes("javascript:") || style?.includes("expression("))
          delete attribs.style;
        if (attribs.target !== "_blank") delete attribs.target;
        return { tagName, attribs };
      },
    },
  });
}

/** Resolve samples in both views while keeping edit ranges in the original template. */
export function renderEmailCanvas(
  source: string,
  values: Record<string, string>,
): EmailCanvas {
  const root = parseDocument(source, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const targets = new Map<string, EmailEditTarget>();
  const replacements: Replacement[] = [];
  const mark = (target: EmailEditTarget) => {
    const id = "m" + targets.size;
    targets.set(id, target);
    return `data-mail-editor-id="${id}"`;
  };
  type Node = (typeof root.children)[number];
  const visit = (nodes: Node[], parent = "") => {
    for (const node of nodes) {
      if (node.startIndex === null || node.endIndex === null) continue;
      const start = node.startIndex;
      const end = node.endIndex + 1;
      if (
        node.type === "text" &&
        node.data.trim() &&
        !tableStructure.has(parent)
      ) {
        const marker = mark({
          kind: "text",
          text: node.data,
          textRange: { start, end },
        });
        replacements.push({
          start,
          end,
          value: `<span ${marker}>${source.slice(start, end)}</span>`,
        });
      } else if ("attribs" in node && !dropped.has(node.name)) {
        const { name, attribs } = node;
        const url = (name === "a" ? attribs.href : attribs.src) ?? "";
        const optional = attribs["data-mail-optional"];
        const linkText =
          name === "a" && node.children.every((child) => child.type === "text");
        if (
          ((name === "img" || linkText) &&
            optional &&
            !sample(values, optional)) ||
          (name === "img" &&
            url.trim() &&
            !interpolateEmail(url, values).trim())
        ) {
          replacements.push({ start, end, value: "" });
          continue;
        }
        if (name === "a" || name === "img") {
          const opening = /^<[\w:-]+(?:[^"'<>]|"[^"]*"|'[^']*')*>/.exec(
            source.slice(start, end),
          )?.[0];
          if (opening) {
            const tagRange = { start, end: start + opening.length };
            const closing = linkText
              ? /<\/a\s*>$/i.exec(source.slice(start, end))
              : null;
            const textRange = closing
              ? { start: tagRange.end, end: end - closing[0].length }
              : undefined;
            const label = textRange
              ? node.children
                  .map((child) => (child.type === "text" ? child.data : ""))
                  .join("")
              : undefined;
            const marker = mark({
              kind: name === "a" ? "link" : "image",
              url,
              text: name === "img" ? (attribs.alt ?? "") : label,
              tagRange,
              textRange,
            });
            replacements.push({
              ...tagRange,
              value: opening.replace(/^<[\w:-]+/, (tag) => `${tag} ${marker}`),
            });
            if (name === "img" || textRange) continue;
          }
        }
        visit(node.children, name);
      }
    }
  };
  visit(root.children);
  const annotated = replaceRanges(source, replacements);
  const rendered = annotated.replace(token, (_match, key: string) =>
    escapeHtml(sample(values, key)),
  );
  const body = cleanMarkup(rendered);
  return {
    targets,
    document: `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:0;color:#20252d;background:#fff;font:14px/1.7 system-ui,sans-serif}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${body}</body></html>`,
  };
}

function updateAttribute(tag: string, name: string, value: string) {
  let found = false;
  const attribute = value ? ` ${name}="${escapeHtml(value)}"` : "";
  const updated = tag.replace(
    /\s+([^\s=/>]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?/g,
    (markup, key: string) => {
      if (key.toLowerCase() !== name) return markup;
      if (found) return "";
      found = true;
      return attribute;
    },
  );
  return found ? updated : updated.replace(/\/?>$/, (end) => attribute + end);
}

export function editEmailCanvas(
  source: string,
  target: EmailEditTarget,
  text: string,
  url: string,
) {
  const replacements: Replacement[] = [];
  if (target.textRange && target.text !== text) {
    replacements.push({ ...target.textRange, value: escapeHtml(text) });
  }
  if (target.tagRange) {
    let tag = source.slice(target.tagRange.start, target.tagRange.end);
    if (target.url !== url) {
      tag = updateAttribute(tag, target.kind === "image" ? "src" : "href", url);
      if (tag.includes("data-mail-optional")) {
        const variable = /^\{\{\s*([a-zA-Z_][a-zA-Z0-9_.]*)\s*\}\}$/.exec(
          url,
        )?.[1];
        tag = updateAttribute(tag, "data-mail-optional", variable ?? "");
      }
    }
    if (target.kind === "image" && target.text !== text)
      tag = updateAttribute(tag, "alt", text);
    replacements.push({ ...target.tagRange, value: tag });
  }
  return replaceRanges(source, replacements);
}
