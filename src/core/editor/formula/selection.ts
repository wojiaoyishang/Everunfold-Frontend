export interface FormulaSourceRange {
  start: number;
  end: number;
}
/** Locate a unique literal fragment, allowing only insignificant math whitespace. Never guess duplicates. */
export function formulaSourceRange(
  source: string,
  fragment: string,
): FormulaSourceRange | undefined {
  if (!fragment.trim()) return;
  const tokens = (value: string) =>
    Array.from(value.matchAll(/\\[a-zA-Z]+|\\[^a-zA-Z]|[^\s]/g));
  const raw = tokens(source),
    selected = tokens(fragment);
  const matches: FormulaSourceRange[] = [];
  for (let i = 0; i <= raw.length - selected.length; i++) {
    if (selected.every((token, j) => token[0] === raw[i + j][0]))
      matches.push({
        start: raw[i].index!,
        end:
          raw[i + selected.length - 1].index! +
          raw[i + selected.length - 1][0].length,
      });
  }
  return matches.length === 1 ? matches[0] : undefined;
}
