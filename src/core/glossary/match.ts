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

const asciiWord = /^[A-Za-z0-9_]/;
const asciiWordCharacter = /[A-Za-z0-9_]/;

type CandidatePattern = {
  text: string;
  case_sensitive: boolean;
  whole_word: boolean;
  priority: number;
};

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
  const candidates: (GlossaryTextMatch & { priority: number })[] = [];
  for (const term of terms) {
    const patterns: CandidatePattern[] =
      (term.matched_patterns?.length ?? 0) > 0
        ? (term.matched_patterns ?? [])
        : term.matched_texts.map((text) => ({
            text,
            case_sensitive: false,
            whole_word: true,
            priority: 0,
          }));
    for (const rule of patterns) {
      const text = rule.text.trim();
      if (!text) continue;
      const haystack = rule.case_sensitive ? input : source;
      const needle = rule.case_sensitive ? text : text.toLocaleLowerCase();
      let offset = 0;
      while (offset < haystack.length) {
        const start = haystack.indexOf(needle, offset);
        if (start < 0) break;
        const end = start + needle.length;
        if (!rule.whole_word || boundarySafe(input, start, end, text))
          candidates.push({
            start,
            end,
            term,
            text: input.slice(start, end),
            priority: rule.priority,
          });
        offset = Math.max(start + 1, end);
      }
    }
  }
  candidates.sort(
    (left, right) =>
      left.start - right.start ||
      right.priority - left.priority ||
      right.end - right.start - (left.end - left.start) ||
      left.term.id.localeCompare(right.term.id),
  );
  const selected: GlossaryTextMatch[] = [];
  let cursor = 0;
  for (const candidate of candidates) {
    if (candidate.start < cursor) continue;
    selected.push({
      start: candidate.start,
      end: candidate.end,
      term: candidate.term,
      text: candidate.text,
    });
    cursor = candidate.end;
    if (selected.length >= limit) break;
  }
  return selected;
}
