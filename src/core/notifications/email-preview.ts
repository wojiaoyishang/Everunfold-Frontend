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
      "*": ["class", "style", "title"],
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

/** Only the isolated preview substitutes template variables. */
export function renderEmailPreview(
  source: string,
  values: Record<string, string>,
): string {
  const root = parseDocument(source, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const hidden: { start: number; end: number }[] = [];
  const visit = (nodes: typeof root.children) => {
    for (const node of nodes) {
      if (!("attribs" in node) || dropped.has(node.name)) continue;
      const { name, attribs } = node;
      const optional = attribs["data-mail-optional"];
      const plainLink =
        name === "a" && node.children.every((child) => child.type === "text");
      const emptyImage =
        name === "img" &&
        attribs.src &&
        !interpolateEmail(attribs.src, values).trim();
      if (
        node.startIndex !== null &&
        node.endIndex !== null &&
        (emptyImage ||
          ((name === "img" || plainLink) &&
            optional &&
            !sample(values, optional)))
      ) {
        hidden.push({ start: node.startIndex, end: node.endIndex + 1 });
      } else {
        visit(node.children);
      }
    }
  };
  visit(root.children);
  let last = 0;
  const chunks = hidden.map(({ start, end }) => {
    const chunk = source.slice(last, start);
    last = end;
    return chunk;
  });
  chunks.push(source.slice(last));
  const body = cleanMarkup(
    chunks
      .join("")
      .replace(token, (_match, key: string) => escapeHtml(sample(values, key))),
  );
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src https: http: data:; style-src 'unsafe-inline'; form-action 'none'; base-uri 'none'"><style>body{margin:0;color:#20252d;background:#fff;font:14px/1.7 system-ui,sans-serif}img{max-width:100%;height:auto}table{max-width:100%}</style></head><body>${body}</body></html>`;
}
