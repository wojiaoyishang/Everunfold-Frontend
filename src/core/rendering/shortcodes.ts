import sanitizeHtml from "sanitize-html";
import { DomUtils, parseDocument } from "htmlparser2";

const escapeAttribute = (value: string) =>
  DomUtils.textContent(
    parseDocument(
      sanitizeHtml(value, { allowedTags: [], allowedAttributes: {} }),
    ),
  )
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function attributes(raw: string): Record<string, string> {
  return Object.fromEntries(
    [...raw.matchAll(/([a-z]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s]+))/gi)].map(
      (match) => [match[1].toLowerCase(), match[2] ?? match[3] ?? match[4]],
    ),
  );
}

function present(kind: string, raw: string, body: string): string {
  const attrs = attributes(raw);
  const title = escapeAttribute(attrs.title ?? "");
  const color = [
    "indigo",
    "green",
    "red",
    "orange",
    "blue",
    "black",
    "grey",
  ].includes(attrs.color)
    ? attrs.color
    : "indigo";
  if (kind === "tooltips")
    return `<span class="legacy-tooltip" tabindex="0" title="${escapeAttribute((attrs.content ?? "").slice(0, 512))}">${body || escapeAttribute(attrs.keyword ?? "")}</span>`;
  if (kind === "collapse" || kind === "fold")
    return `\n<details class="legacy-collapse tone-${color}"${attrs.collapsed === "false" ? " open" : ""}><summary>${title || "展开内容"}</summary>\n\n<div class="legacy-collapse-body">\n\n${body}\n\n</div></details>\n`;
  return `\n<div class="legacy-alert tone-${color}">${title ? `<strong class="legacy-alert-title">${title}</strong>` : ""}\n\n${body}\n\n</div>\n`;
}

/** A closed presentation-only vocabulary; no WordPress/PHP execution or data lookup. */
export function expandPresentationShortcodes(raw: string): string {
  // Protected code, comments and HTML attributes are tokens too, so examples stay literal.
  const token =
    /(^[ \t]*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^[ \t]*\2[^\n]*$)|<pre\b[^>]*>[\s\S]*?<\/pre\s*>|<code\b[^>]*>[\s\S]*?<\/code\s*>|<!--[^]*?-->|<(?:[^>"']|"[^"]*"|'[^']*')*>|(`+)[^]*?\3|\[(\/?)(collapse|fold|alert|admonition|tooltips)\b((?:[^\]"']|"[^"]*"|'[^']*')*)\]/gim;
  const stack: {
    kind: string;
    attrs: string;
    start: number;
    parts: string[];
  }[] = [{ kind: "", attrs: "", start: 0, parts: [] }];
  let cursor = 0;
  for (const match of raw.matchAll(token)) {
    const current = stack[stack.length - 1];
    current.parts.push(raw.slice(cursor, match.index));
    cursor = match.index + match[0].length;
    const kind = match[5]?.toLowerCase();
    if (!kind || stack.length > 40) current.parts.push(match[0]);
    else if (!match[4])
      stack.push({ kind, attrs: match[6], start: match.index, parts: [] });
    else if (current.kind === kind) {
      stack.pop();
      stack[stack.length - 1].parts.push(
        present(kind, current.attrs, current.parts.join("")),
      );
    } else current.parts.push(match[0]);
  }
  // Malformed/unclosed containers remain unchanged, including their nested text.
  return (
    stack[0].parts.join("") +
    raw.slice(stack.length > 1 ? stack[1].start : cursor)
  );
}

export function presentationExcerpt(text: string): string {
  const clean = text
    .replace(
      /\[\/?(?:collapse|fold|alert|admonition|tooltips)\b[^\]]*(?:\]|$)/gi,
      "",
    )
    .trim();
  const start = clean.lastIndexOf("[");
  const tail = clean
    .slice(start + 1)
    .replace(/^\//, "")
    .toLowerCase();
  return start >= 0 &&
    tail.length >= 3 &&
    ["collapse", "fold", "alert", "admonition", "tooltips"].some((name) =>
      name.startsWith(tail),
    )
    ? clean.slice(0, start).trimEnd()
    : clean;
}
