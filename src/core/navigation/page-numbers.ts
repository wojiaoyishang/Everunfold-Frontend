/** Keep both ends and the current neighborhood, without hiding a single page behind an ellipsis. */
export function pageNumbers(page: number, pages: number) {
  if (pages <= 7) return Array.from({ length: pages }, (_, index) => index + 1);
  const stops = [...new Set([1, page - 1, page, page + 1, pages])]
    .filter((number) => number >= 1 && number <= pages)
    .sort((left, right) => left - right);
  return stops.flatMap((number, index) =>
    index > 0 && number - stops[index - 1] === 2
      ? [number - 1, number]
      : [number],
  );
}
