import { parseDocument } from "htmlparser2";
import type { SourceRange } from "./source-positions";

type HtmlNode = ReturnType<typeof parseDocument>["children"][number];

/** Select the smallest complete element, or the selected sibling range. */
export function htmlElementSelection(
  source: string,
  selection: SourceRange,
): SourceRange {
  const root = parseDocument(source, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const elementRange = (node: HtmlNode): SourceRange | undefined => {
    if (!("name" in node) || node.startIndex === null || node.endIndex === null)
      return;
    const start = node.startIndex,
      end = node.endIndex + 1;
    return { start, end };
  };
  const atStart = (range: SourceRange) =>
    range.start <= selection.start && range.end > selection.start;
  const atEnd = (range: SourceRange) =>
    range.start < selection.end && range.end >= selection.end;
  const choose = (nodes: HtmlNode[]): SourceRange | undefined => {
    const elements = nodes.flatMap((node) => {
      const range = elementRange(node);
      return range ? [{ node, range }] : [];
    });
    const first = elements.find(({ range }) => atStart(range));
    const last =
      selection.start === selection.end
        ? first
        : elements.find(({ range }) => atEnd(range));
    if (first && last) {
      if (first.node === last.node && "children" in first.node)
        return choose(first.node.children) ?? first.range;
      return { start: first.range.start, end: last.range.end };
    }
  };
  return choose(root.children) ?? selection;
}
