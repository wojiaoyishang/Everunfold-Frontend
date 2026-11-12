import { alignUnits, htmlUnits } from "./source-positions";
import { renderRichNode } from "./rich-text";
import { htmlRichSource } from "./visual-document";
import { parseDocument } from "htmlparser2";
import { formatHtmlAddition } from "./format-html-addition";

type Change = { from: number; to: number; start: number; end: number };

/** Produce token-level splices so a wrapping mark can retain the spelling of the selected text. */
function changes(before: string[], after: string[]): Change[] {
  let start = 0,
    end = 0;
  while (start < before.length && before[start] === after[start]) start++;
  while (
    end < Math.min(before.length, after.length) - start &&
    before[before.length - 1 - end] === after[after.length - 1 - end]
  )
    end++;
  const oldEnd = before.length - end,
    newEnd = after.length - end;
  const result = [];
  let a = start,
    b = start;
  // Most editor transactions are a single insertion, deletion or small mark
  // change. Bound the diff matrix for large paste and replacement operations.
  const rows = oldEnd - start + 1,
    cols = newEnd - start + 1;
  if (rows * cols > 200_000)
    return [{ from: start, to: oldEnd, start, end: newEnd }];
  const scores = new Uint32Array(rows * cols);
  for (let i = rows - 2; i >= 0; i--)
    for (let j = cols - 2; j >= 0; j--)
      scores[i * cols + j] =
        before[i + start] === after[j + start]
          ? 1 + scores[(i + 1) * cols + j + 1]
          : Math.max(scores[(i + 1) * cols + j], scores[i * cols + j + 1]);
  while (a < oldEnd || b < newEnd) {
    const from = a,
      begin = b;
    while (a < oldEnd || b < newEnd) {
      if (a < oldEnd && b < newEnd && before[a] === after[b]) break;
      const pos = (a - start) * cols + b - start;
      if (a < oldEnd && (b === newEnd || scores[pos + cols] >= scores[pos + 1]))
        a++;
      else b++;
    }
    if (from !== a || begin !== b)
      result.push({ from, to: a, start: begin, end: b });
    a++;
    b++;
  }
  return result;
}

export function patchVisualHtml(
  source: string,
  before: string,
  after: string,
  normalize = (value: string) => renderRichNode(htmlRichSource(value)),
): string | undefined {
  if (before === after) return source;
  if (!source.trim())
    return (
      source +
      formatHtmlAddition(
        source,
        source.length,
        source.length,
        [],
        htmlUnits(after),
        after,
      )
    );
  const raw = htmlUnits(source),
    old = htmlUnits(before),
    next = htmlUnits(after);
  const rawText = (text: string, units: typeof raw) =>
    units.map(({ start, end }) => text.slice(start, end));
  const right = rawText(after, next);
  const edits = changes(rawText(before, old), right);
  const map = alignUnits(old, raw);
  let result = source,
    formatted = source,
    limit = source.length;
  for (const edit of edits.reverse()) {
    const first = map.get(edit.from);
    const last = map.get(edit.to - 1);
    const prior = map.get(edit.from - 1);
    // For inserts prefer the following token; an added sibling remains after
    // the original whitespace. At the end insert before any trailing space.
    const start =
      first !== undefined
        ? raw[first].start
        : prior !== undefined
          ? raw[prior].end
          : edit.from === 0
            ? 0
            : undefined;
    const end =
      edit.from === edit.to
        ? start
        : last !== undefined
          ? raw[last].end
          : undefined;
    if (start === undefined || end === undefined || end > limit || end < start)
      return patchChangedTable(source, before, after, normalize);
    result =
      result.slice(0, start) +
      right.slice(edit.start, edit.end).join("") +
      result.slice(end);
    formatted =
      formatted.slice(0, start) +
      formatHtmlAddition(
        source,
        start,
        end,
        old.slice(edit.from, edit.to),
        next.slice(edit.start, edit.end),
        after,
      ) +
      formatted.slice(end);
    limit = start;
  }
  // The visual model can normalize constructs it cannot round-trip. Do not
  // write a misleading splice if its new projection is different.
  if (normalize(formatted) === normalize(after)) return formatted;
  if (normalize(result) === normalize(after)) return result;
  return patchChangedTable(source, before, after, normalize);
}

/** Cell merges/splits can add schema-only paragraphs absent from the raw HTML.
 * Replace one changed top-level table after verifying both full projections;
 * all source outside that table remains byte-for-byte intact.
 */
function patchChangedTable(
  source: string,
  before: string,
  after: string,
  normalize: (value: string) => string,
) {
  if (normalize(source) !== normalize(before)) return;
  const parts = (html: string) =>
    parseDocument(html, { withStartIndices: true, withEndIndices: true })
      .children.filter((node) => node.type !== "text" || node.data.trim())
      .map((node) => ({
        tag: "name" in node ? node.name : "",
        start: node.startIndex ?? 0,
        end: (node.endIndex ?? -1) + 1,
      }));
  const old = parts(before),
    next = parts(after),
    raw = parts(source);
  if (old.length !== next.length || old.length !== raw.length) return;
  const changed = old
    .map((part, index) =>
      before.slice(part.start, part.end) ===
      after.slice(next[index].start, next[index].end)
        ? -1
        : index,
    )
    .filter((index) => index >= 0);
  if (changed.length !== 1) return;
  const index = changed[0];
  if (
    [old[index], next[index], raw[index]].some((part) => part.tag !== "table")
  )
    return;
  const result =
    source.slice(0, raw[index].start) +
    after.slice(next[index].start, next[index].end) +
    source.slice(raw[index].end);
  if (normalize(result) === normalize(after)) return result;
}
