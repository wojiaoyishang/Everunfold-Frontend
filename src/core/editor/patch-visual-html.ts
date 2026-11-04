import { alignUnits, htmlUnits } from "./source-positions";
import { renderRichNode, sourceDocument } from "./rich-text";

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
): string | undefined {
  if (before === after) return source;
  if (!source.trim()) return source + after;
  const raw = htmlUnits(source),
    old = htmlUnits(before),
    next = htmlUnits(after);
  const rawText = (text: string, units: typeof raw) =>
    units.map(({ start, end }) => text.slice(start, end));
  const right = rawText(after, next);
  const edits = changes(rawText(before, old), right);
  const map = alignUnits(old, raw);
  let result = source,
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
      return;
    result =
      result.slice(0, start) +
      right.slice(edit.start, edit.end).join("") +
      result.slice(end);
    limit = start;
  }
  // The visual model can normalize constructs it cannot round-trip. Do not
  // write a misleading splice if its new projection is different.
  const normalize = (value: string) => renderRichNode(sourceDocument(value));
  if (normalize(result) === normalize(after)) return result;
}
