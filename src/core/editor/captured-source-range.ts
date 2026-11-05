import { sourceSplice } from "./source-lines";
import type { SourceRange } from "./source-positions";

/** Rebase an open insertion dialog only across an unrelated source edit. */
export function capturedSourceRange(
  before: string,
  after: string,
  range: SourceRange,
): SourceRange | undefined {
  if (before === after) return range;
  const change = sourceSplice(before, after);
  if (change.to <= range.start) {
    const delta = change.insert.length - (change.to - change.from);
    return { start: range.start + delta, end: range.end + delta };
  }
  if (change.from >= range.end) return range;
}
