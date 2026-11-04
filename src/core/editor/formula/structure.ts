interface FormulaElement {
  depth?: number;
  latex?: string;
}
/** Public MathLive atoms are ordered children-first. An ancestor follows its children at a lower depth. */
export function formulaArrayContext(
  position: number,
  lastOffset: number,
  read: (offset: number) => FormulaElement | undefined,
) {
  let depth = read(position)?.depth ?? 0;
  for (
    let offset = position + 1;
    offset <= Math.min(lastOffset, position + 1024);
    offset++
  ) {
    const info = read(offset);
    if (info?.depth === undefined || info.depth >= depth) continue;
    depth = info.depth;
    if (
      /^\\begin\{(?:[pbvBV]?matrix\*?|cases|aligned|array)\}/.test(
        info.latex ?? "",
      )
    )
      return offset;
  }
  return undefined;
}
