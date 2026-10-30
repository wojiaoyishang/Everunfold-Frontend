export function wheelDistance(
  delta: number,
  mode: number,
  viewport: number,
): number {
  return delta * (mode === 1 ? 32 : mode === 2 ? viewport : 1);
}

/** Leave small/high-resolution touchpad deltas native; enhance coarse wheel steps. */
export function isSteppedWheel(delta: number, mode: number): boolean {
  return mode !== 0 || (Number.isInteger(delta) && Math.abs(delta) >= 50);
}

export function easeOutExpo(progress: number): number {
  return progress >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, progress));
}
