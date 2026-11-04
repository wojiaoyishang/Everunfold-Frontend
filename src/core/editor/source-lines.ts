import type { ChangeSet } from "@codemirror/state";

export const normalizeSourceLines = (source: string) =>
  source.replace(/\r\n?/g, "\n");

/** CodeMirror indexes LF-normalized positions, while the draft keeps original separators. */
export function rawSourceOffset(source: string, offset: number) {
  let raw = offset;
  for (const match of source.matchAll(/\r\n/g)) {
    if (match.index >= raw) break;
    raw++;
  }
  return raw;
}

export function normalizedSourceOffset(source: string, offset: number) {
  return normalizeSourceLines(source.slice(0, offset)).length;
}

export function applySourceChanges(source: string, changes: ChangeSet) {
  const newline = /\r\n|\r|\n/.exec(source)?.[0] ?? "\n";
  const extras = Array.from(source.matchAll(/\r\n/g), (match) => match.index);
  let at = 0,
    extra = 0,
    result = "";
  const raw = (offset: number) => {
    while (extra < extras.length && extras[extra] < offset + extra) extra++;
    return offset + extra;
  };
  changes.iterChanges((from, to, _, __, insert) => {
    result +=
      source.slice(at, raw(from)) +
      insert.sliceString(0, insert.length, newline);
    at = raw(to);
  });
  return result + source.slice(at);
}

/** Replace just the changed span when the other view updates the source. */
export function sourceSplice(before: string, after: string) {
  let from = 0,
    suffix = 0;
  while (
    from < Math.min(before.length, after.length) &&
    before[from] === after[from]
  )
    from++;
  if (/[\uD800-\uDBFF]/.test(before[from - 1] ?? "")) from--;
  while (
    suffix < Math.min(before.length, after.length) - from &&
    before[before.length - suffix - 1] === after[after.length - suffix - 1]
  )
    suffix++;
  if (/[\uDC00-\uDFFF]/.test(before[before.length - suffix] ?? "")) suffix--;
  return {
    from,
    to: before.length - suffix,
    insert: after.slice(from, after.length - suffix),
  };
}
