import { DomUtils, parseDocument } from "htmlparser2";
import { markdownSourceTokens } from "@/core/rendering/content";
import {
  parseCodeInfo,
  parseCodeOptions,
} from "@/core/rendering/features/code-options";
import type { ContentFeatureValue } from "./content-feature-source";
import type { SourceRange } from "./source-positions";

/** Find an enclosing source snippet without normalizing the rest of the document. */
export function sourceCodeSnippet(
  source: string,
  selection: SourceRange,
  format: "markdown" | "html",
) {
  if (format === "html") {
    const document = parseDocument(source, {
      withStartIndices: true,
      withEndIndices: true,
    });
    const block = DomUtils.findAll(
      (node) => node.name === "pre",
      document.children,
    )
      .filter(
        (node) =>
          node.startIndex !== null &&
          node.endIndex !== null &&
          node.startIndex <= selection.start &&
          node.endIndex + 1 >= selection.end,
      )
      .at(-1);
    if (!block || block.startIndex === null || block.endIndex === null) return;
    const code = block.children.find(
      (node) => "name" in node && node.name === "code",
    );
    const language =
      /\blanguage-([\w+-]+)/.exec(
        code && "attribs" in code
          ? (code.attribs.class ?? "")
          : (block.attribs.class ?? ""),
      )?.[1] ?? "plaintext";
    return {
      range: { start: block.startIndex, end: block.endIndex + 1 },
      initial: {
        source: DomUtils.textContent(code ?? block),
        language,
        display: true,
        codeOptions: parseCodeOptions(block.attribs["data-code"]),
      },
      suffix: "",
    };
  }
  const starts = [
    0,
    ...Array.from(
      source.matchAll(/\r\n|\r|\n/g),
      (match) => match.index + match[0].length,
    ),
  ];
  for (const token of markdownSourceTokens(source)) {
    if (token.type !== "fence" || token.level !== 0 || !token.map) continue;
    const range = {
      start: starts[token.map[0]],
      end: starts[token.map[1]] ?? source.length,
    };
    if (selection.start < range.start || selection.end > range.end) continue;
    const raw = source.slice(range.start, range.end),
      opening = /^ {0,3}(`{3,}|~{3,})[^\r\n]*(?:\r\n|\n|\r)/.exec(raw);
    if (!opening) continue;
    const fence = opening[1],
      tail = new RegExp(
        `(?:\\r\\n|\\n|\\r)? {0,3}${fence[0]}{${fence.length},}[ \\t]*(?:(?:\\r\\n|\\n|\\r))?$`,
      );
    const inner = raw.slice(opening[0].length),
      close = tail.exec(inner);
    if (!close) continue;
    const info = parseCodeInfo(token.info);
    return {
      range,
      initial: {
        source: inner.slice(0, close.index),
        language: info.language,
        display: true,
        codeOptions: info.options,
      } satisfies ContentFeatureValue,
      suffix: raw.endsWith("\r\n")
        ? "\r\n"
        : /[\r\n]$/.test(raw)
          ? raw.at(-1)!
          : "",
    };
  }
}
