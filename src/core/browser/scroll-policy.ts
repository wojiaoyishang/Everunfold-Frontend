export function wheelDistance(
  delta: number,
  mode: number,
  viewport: number,
): number {
  return delta * (mode === 1 ? 32 : mode === 2 ? viewport : 1);
}

/** Time-based damping also accepts fractional/high-DPI wheel input. */
export function dampedPosition(
  position: number,
  target: number,
  milliseconds: number,
): number {
  return (
    position +
    (target - position) * (1 - Math.exp(-Math.max(0, milliseconds) / 145))
  );
}

export function easeOutExpo(progress: number): number {
  return progress >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, progress));
}
