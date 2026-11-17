import { defaultWheelScroll } from "./wheel-scroll-policy";

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
  inertiaMs = 145,
): number {
  return (
    position +
    (target - position) * (1 - Math.exp(-Math.max(0, milliseconds) / inertiaMs))
  );
}

export function easeOutExpo(progress: number): number {
  return progress >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, progress));
}

/** Pixel streams already carry OS momentum; interpolate only discrete wheel notches. */
export function discreteWheel(delta: number, mode: number): boolean {
  return (
    mode !== 0 ||
    (Number.isInteger(delta) &&
      Math.abs(delta) >= 100 &&
      (Math.abs(delta) % 100 === 0 || Math.abs(delta) % 120 === 0))
  );
}
export function wheelAcceleration(
  gap: number,
  sameDirection: boolean,
  extraPercent = defaultWheelScroll.acceleration_percent,
): number {
  return sameDirection && gap >= 0 && gap < 160
    ? 1 + (1 - gap / 160) * (extraPercent / 100)
    : 1;
}
