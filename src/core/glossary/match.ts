import type { GlossaryContract } from "@/core/contracts/glossary";

export type GlossaryMatchTerm = NonNullable<
  GlossaryContract["content_matches"]["data"]
>["terms"][number];

export type GlossaryTextMatch = {
  end: number;
  start: number;
  term: GlossaryMatchTerm;
  text: string;
};

const asciiWord = /^[A-Za-z0-9]/;
const asciiWordCharacter = /[A-Za-z0-9]/;

function boundarySafe(
  source: string,
  start: number,
  end: number,
  value: string,
) {
  if (
    asciiWord.test(value) &&
    start > 0 &&
    asciiWordCharacter.test(source[start - 1])
  )
    return false;
  if (
    asciiWord.test(value.at(-1) ?? "") &&
    end < source.length &&
    asciiWordCharacter.test(source[end])
  )
    return false;
  return true;
}

/** Find deterministic, non-overlapping matches while preferring the longest term. */
export function matchGlossaryText(
  input: string,
  terms: readonly GlossaryMatchTerm[],
  limit: number,
): GlossaryTextMatch[] {
  if (limit <= 0 || !input) return [];
  const source = input.toLocaleLowerCase();
  const candidates: GlossaryTextMatch[] = [];
  for (const term of terms) {
    for (const raw of term.matched_texts) {
      const text = raw.trim();
      if (!text) continue;
      const needle = text.toLocaleLowerCase();
      let offset = 0;
      while (offset < source.length) {
        const start = source.indexOf(needle, offset);
        if (start < 0) break;
        const end = start + needle.length;
        if (boundarySafe(source, start, end, text))
          candidates.push({ start, end, term, text: input.slice(start, end) });
        offset = Math.max(start + 1, end);
      }
    }
  }
  candidates.sort(
    (left, right) =>
      left.start - right.start ||
      right.end - right.start - (left.end - left.start) ||
      left.term.id.localeCompare(right.term.id),
  );
  const selected: GlossaryTextMatch[] = [];
  let cursor = 0;
  for (const candidate of candidates) {
    if (candidate.start < cursor) continue;
    selected.push(candidate);
    cursor = candidate.end;
    if (selected.length >= limit) break;
  }
  return selected;
}
