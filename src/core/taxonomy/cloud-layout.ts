export type CloudWord = { id: string; name: string; count: number };
export type PlacedWord = CloudWord & {
  x: number;
  y: number;
  size: number;
  width: number;
  height: number;
};
/** Deterministic spiral packing, with real measured text widths and bounded work. */
export function layoutWords(
  words: readonly CloudWord[],
  width: number,
  height: number,
  measure: (text: string, size: number) => number,
): PlacedWord[] {
  const max = Math.max(1, ...words.map((w) => w.count));
  const result: PlacedWord[] = [];
  for (const word of [...words]
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, 80)) {
    const size = Math.min(
      width < 500 ? 34 : 52,
      16 + (Math.log1p(word.count) / Math.log1p(max)) * (width < 500 ? 18 : 36),
    );
    const w = Math.min(width - 12, measure(word.name, size) + 16),
      h = size * 1.5 + 8;
    for (let step = 0; step < 3000; step++) {
      const angle = step * 0.43,
        radius = 1.7 * Math.sqrt(step) * 3;
      const x = width / 2 + Math.cos(angle) * radius * (width / height) - w / 2,
        y = height / 2 + Math.sin(angle) * radius - h / 2;
      if (x < 6 || y < 6 || x + w > width - 6 || y + h > height - 6) continue;
      if (
        result.some(
          (p) =>
            x < p.x + p.width + 4 &&
            x + w + 4 > p.x &&
            y < p.y + p.height + 4 &&
            y + h + 4 > p.y,
        )
      )
        continue;
      result.push({ ...word, x, y, size, width: w, height: h });
      break;
    }
  }
  return result;
}
