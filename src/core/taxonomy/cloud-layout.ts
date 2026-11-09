export type CloudWord = { id: string; name: string; count: number };
export type PlacedWord = CloudWord & {
  x: number;
  y: number;
  size: number;
  width: number;
  height: number;
  angle: number;
  textWidth: number;
  textHeight: number;
};
export type CloudLayoutOptions = {
  limit?: number;
  minSize?: number;
  maxSize?: number;
  rotations?: readonly number[];
  dense?: boolean;
  fill?: boolean;
};
type Rect = { x: number; y: number; width: number; height: number };
const intersects = (a: Rect, b: Rect) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y;

/** Deterministic measured packing; the admin variant uses bounded free rectangles. */
export function layoutWords(
  words: readonly CloudWord[],
  width: number,
  height: number,
  measure: (text: string, size: number) => number,
  options: CloudLayoutOptions = {},
): PlacedWord[] {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width < 24 ||
    height < 24
  )
    return [];
  const common = [...words]
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
    .slice(0, Math.min(100, Math.max(0, options.limit ?? 80)));
  if (options.dense) {
    let best = denseWords(common, width, height, measure, options);
    if (options.fill && common.length <= 20) {
      for (const factor of [0.85, 0.7, 0.55]) {
        if (best.length === common.length) break;
        const candidate = denseWords(
          common,
          width,
          height,
          measure,
          options,
          factor,
        );
        if (candidate.length > best.length) best = candidate;
      }
    }
    return best;
  }
  const max = Math.max(1, ...common.map((w) => w.count));
  const result: PlacedWord[] = [];
  const maximum = options.maxSize ?? (width < 500 ? 34 : 52);
  const minimum = Math.min(maximum, options.minSize ?? 16);
  for (const word of common) {
    const size =
      minimum +
      (Math.log1p(Math.max(0, word.count)) / Math.log1p(max)) *
        (maximum - minimum);
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
      result.push({
        ...word,
        x,
        y,
        size,
        width: w,
        height: h,
        angle: 0,
        textWidth: w,
        textHeight: h,
      });
      break;
    }
  }
  return result;
}

function denseWords(
  words: readonly CloudWord[],
  width: number,
  height: number,
  measure: (text: string, size: number) => number,
  options: CloudLayoutOptions,
  growth = 1,
): PlacedWord[] {
  const maximum = options.maxSize ?? (width < 500 ? 26 : 36);
  const minimum = Math.min(maximum, options.minSize ?? 11);
  const max = Math.max(1, ...words.map((word) => word.count));
  const rotations = options.rotations?.filter(Number.isFinite).slice(0, 12);
  const angles = rotations?.length ? rotations : [0];
  const nominalArea = words.reduce((area, word, index) => {
    const size =
      minimum +
      (Math.log1p(Math.max(0, word.count)) / Math.log1p(max)) *
        (maximum - minimum);
    const radians = (angles[index % angles.length] * Math.PI) / 180;
    const w = measure(word.name, size) + 8,
      h = size * 1.5 + 4;
    return (
      area +
      (Math.abs(w * Math.cos(radians)) + Math.abs(h * Math.sin(radians))) *
        (Math.abs(w * Math.sin(radians)) + Math.abs(h * Math.cos(radians)))
    );
  }, 0);
  const areaScale = Math.sqrt(
    (width * height * 0.67) / Math.max(1, nominalArea),
  );
  const fitScale = (options.fill ? areaScale : Math.min(1, areaScale)) * growth;
  let free: Rect[] = [{ x: 4, y: 4, width: width - 8, height: height - 8 }];
  const result: PlacedWord[] = [];
  for (const [index, word] of words.entries()) {
    const preferred = angles[index % angles.length];
    const variants = [...new Set([preferred, ...angles])];
    const desired = Math.max(
      minimum,
      (minimum +
        (Math.log1p(Math.max(0, word.count)) / Math.log1p(max)) *
          (maximum - minimum)) *
        fitScale,
    );
    let placed: PlacedWord | undefined;
    // Smaller fonts fill the remaining gaps without repeatedly repacking earlier words.
    for (let attempt = 0; attempt < 5 && !placed; attempt++) {
      const size = Math.max(
        minimum,
        desired - ((desired - minimum) * attempt) / 4,
      );
      for (const angle of variants) {
        const radians = (angle * Math.PI) / 180;
        const textWidth = Math.min(
            measure(word.name, size) + 8,
            Math.max(width, height) - 8,
          ),
          textHeight = size * 1.5 + 4;
        const w =
            Math.abs(textWidth * Math.cos(radians)) +
            Math.abs(textHeight * Math.sin(radians)),
          h =
            Math.abs(textWidth * Math.sin(radians)) +
            Math.abs(textHeight * Math.cos(radians));
        let candidate: Rect | undefined,
          best = Infinity;
        for (const rect of free) {
          if (rect.width < w || rect.height < h) continue;
          const x = Math.max(
              rect.x,
              Math.min(width / 2 - w / 2, rect.x + rect.width - w),
            ),
            y = Math.max(
              rect.y,
              Math.min(height / 2 - h / 2, rect.y + rect.height - h),
            );
          const score =
            Math.hypot(x + w / 2 - width / 2, y + h / 2 - height / 2) +
            Math.min(rect.width - w, rect.height - h) * 0.15;
          if (score < best) {
            best = score;
            candidate = { x, y, width: w, height: h };
          }
        }
        if (!candidate) continue;
        placed = { ...word, ...candidate, size, angle, textWidth, textHeight };
        break;
      }
    }
    if (!placed) continue;
    result.push(placed);
    const occupied = {
      x: placed.x - 1,
      y: placed.y - 1,
      width: placed.width + 2,
      height: placed.height + 2,
    };
    const pieces: Rect[] = [];
    for (const rect of free) {
      if (!intersects(rect, occupied)) {
        pieces.push(rect);
        continue;
      }
      if (occupied.x > rect.x)
        pieces.push({ ...rect, width: occupied.x - rect.x });
      if (occupied.x + occupied.width < rect.x + rect.width)
        pieces.push({
          ...rect,
          x: occupied.x + occupied.width,
          width: rect.x + rect.width - occupied.x - occupied.width,
        });
      if (occupied.y > rect.y)
        pieces.push({ ...rect, height: occupied.y - rect.y });
      if (occupied.y + occupied.height < rect.y + rect.height)
        pieces.push({
          ...rect,
          y: occupied.y + occupied.height,
          height: rect.y + rect.height - occupied.y - occupied.height,
        });
    }
    free = pieces
      .filter(
        (rect, i) =>
          rect.width >= minimum &&
          rect.height >= minimum &&
          !pieces.some(
            (other, j) =>
              j !== i &&
              other.x <= rect.x &&
              other.y <= rect.y &&
              other.x + other.width >= rect.x + rect.width &&
              other.y + other.height >= rect.y + rect.height &&
              (j < i || other.width > rect.width || other.height > rect.height),
          ),
      )
      .slice(0, 1024);
  }
  return result;
}
