import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import type { Node } from "@tiptap/pm/model";
import {
  markdownSourceTokens,
  renderMarkdownSource,
} from "@/core/rendering/content";
import { markdownUnits } from "./markdown-selection";
import { renderRichNode } from "./rich-text";
import { htmlRichSource } from "./visual-document";
import { protectVisualShortcodes } from "./shortcode-source";
import { codeInfo } from "@/core/rendering/features/code-options";
import {
  richTextUnits,
  transferRange,
  type SourceRange,
} from "./source-positions";

export const markdownSourceLanguage = markdown({ base: markdownLanguage });
const escape = (text: string) => text.replace(/[\\`*_~\[\]<>#!|]/g, "\\$&");
const children = (node: Node) =>
  Array.from({ length: node.childCount }, (_, index) => node.child(index));

export function markdownRichSource(source: string) {
  return htmlRichSource(
    renderMarkdownSource(protectVisualShortcodes(source, true), true),
    true,
  );
}

export function richMarkdownSelection(
  doc: Node,
  source: string,
  range: SourceRange,
  reverse = false,
) {
  if (doc.childCount === 1 && doc.firstChild?.type.name === "rawHtml")
    return reverse ? { start: 0, end: 1 } : { start: 0, end: source.length };
  const raw = markdownUnits(markdownSourceLanguage.language.parser, source);
  const rich = richTextUnits(doc);
  return reverse
    ? transferRange(raw, rich, range)
    : transferRange(rich, raw, range);
}

function serialize(node: Node): string {
  if (node.isText) {
    let text = escape(node.text ?? "");
    for (const mark of node.marks) {
      const kind = mark.type.name;
      const marker = { bold: "**", italic: "*", strike: "~~" }[kind];
      if (marker)
        text = text.replace(
          /^(\s*)([\s\S]*?)(\s*)$/,
          `$1${marker}$2${marker}$3`,
        );
      else if (kind === "code") {
        const raw = node.text ?? "";
        const fence = "`".repeat(
          1 + Math.max(0, ...(raw.match(/`+/g) ?? []).map((run) => run.length)),
        );
        const padded = /^[` ]|[` ]$/.test(raw) ? " " + raw + " " : raw;
        text = fence + padded + fence;
      } else if (kind === "link" && typeof mark.attrs.href === "string") {
        const target = mark.attrs.href.replaceAll(">", "%3E");
        const title = mark.attrs.title
          ? " " + JSON.stringify(mark.attrs.title)
          : "";
        text = `[${text}](<${target}>${title})`;
      } else return renderRichNode(node.toJSON());
    }
    return text;
  }
  const parts = children(node).map(serialize);
  const content = parts.join("");
  switch (node.type.name) {
    case "nativeShortcode":
      return String(node.attrs.source);
    case "localVideo": {
      const label = String(node.attrs.title ?? "").replace(/[\\\[\]]/g, "\\$&");
      return (
        `![${label}](<${String(node.attrs.src).replaceAll(">", "%3E")}>)` +
        "{type=video}"
      );
    }
    case "paragraph":
      if (node.attrs.textAlign && node.attrs.textAlign !== "left")
        return renderRichNode(node.toJSON());
      return content || "<p></p>";
    case "heading":
      return "#".repeat(Number(node.attrs.level)) + " " + content;
    case "blockquote":
      return parts
        .join("\n\n")
        .split("\n")
        .map((line) => "> " + line)
        .join("\n");
    case "listItem":
      return parts.join("\n\n");
    case "bulletList":
    case "orderedList":
      return parts
        .map((item, index) => {
          const prefix =
            node.type.name === "bulletList"
              ? "- "
              : `${Number(node.attrs.start) + index}. `;
          return (
            prefix + item.replaceAll("\n", "\n" + " ".repeat(prefix.length))
          );
        })
        .join("\n");
    case "horizontalRule":
      return "---";
    case "codeBlock": {
      const code = node.textContent;
      const fence = "`".repeat(
        Math.max(
          3,
          ...Array.from(code.matchAll(/`+/g), (match) => match[0].length + 1),
        ),
      );
      return (
        fence +
        codeInfo(String(node.attrs.language ?? ""), node.attrs.codeOptions) +
        "\n" +
        code +
        "\n" +
        fence
      );
    }
    case "inlineMath":
      return "$" + String(node.attrs.latex).replace(/\r?\n/g, " ") + "$";
    case "blockMath":
      return "$$\n" + String(node.attrs.latex) + "\n$$";
    case "hardBreak":
      return "  \n";
    default:
      return renderRichNode(node.toJSON());
  }
}

/** First try a text splice, then regenerate only the affected Markdown blocks. */
export function patchVisualMarkdown(
  source: string,
  before: Node,
  after: Node,
): string | undefined {
  if (before.eq(after)) return source;
  const expected = renderRichNode(after.toJSON());
  const matches = (value: string) =>
    renderRichNode(markdownRichSource(value)) === expected;
  const start = before.content.findDiffStart(after.content);
  const end = before.content.findDiffEnd(after.content);
  if (start !== null && end && end.a >= start && end.b >= start) {
    const mapped = richMarkdownSelection(before, source, { start, end: end.a });
    if (mapped) {
      const replacement = escape(after.textBetween(start, end.b));
      const candidate =
        source.slice(0, mapped.start) + replacement + source.slice(mapped.end);
      if (matches(candidate)) return candidate;
    }
  }
  if (!source.trim()) {
    const candidate = source + children(after).map(serialize).join("\n\n");
    return matches(candidate) ? candidate : undefined;
  }
  const spans = markdownSourceTokens(source).filter(
    (token) => token.level === 0 && token.map,
  );
  if (spans.length !== before.childCount) return;
  const offsets = [
    0,
    ...Array.from(
      source.matchAll(/\r\n|\n|\r/g),
      (match) => match.index + match[0].length,
    ),
  ];
  const lineStart = (index: number) => offsets[index] ?? source.length;
  let first = 0,
    suffix = 0;
  while (
    first < Math.min(before.childCount, after.childCount) &&
    before.child(first).eq(after.child(first))
  )
    first++;
  while (
    suffix < Math.min(before.childCount, after.childCount) - first &&
    before
      .child(before.childCount - 1 - suffix)
      .eq(after.child(after.childCount - 1 - suffix))
  )
    suffix++;
  const last = before.childCount - suffix;
  const low =
    first < spans.length ? lineStart(spans[first].map![0]) : source.length;
  const high = last > first ? lineStart(spans[last - 1].map![1]) : low;
  const newline = source.includes("\r\n") ? "\r\n" : "\n";
  const trailing = /(?:\r?\n)+$/.exec(source.slice(low, high))?.[0] ?? "";
  const content = children(after)
    .slice(first, after.childCount - suffix)
    .map(serialize)
    .join("\n\n")
    .replaceAll("\n", newline);
  const candidate =
    source.slice(0, low) +
    (content && first === last && low > 0 ? newline + newline : "") +
    content +
    (content
      ? trailing || (high < source.length ? newline + newline : "")
      : "") +
    source.slice(high);
  return matches(candidate) ? candidate : undefined;
}
