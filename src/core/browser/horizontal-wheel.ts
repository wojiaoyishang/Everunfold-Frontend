import { motionEnabled, subscribeMotion } from "./motion";
import { dampedPosition, wheelDistance } from "./scroll-policy";
import { stopScrolling } from "./scroll";

/** Leave the wheel to the page only when the rail has actually reached an edge. */
export function horizontalTarget(
  position: number,
  pending: number,
  delta: number,
  limit: number,
  viewport: number,
): number | null {
  if (
    !delta ||
    limit < 1 ||
    (delta < 0 && position <= 1) ||
    (delta > 0 && position >= limit - 1)
  )
    return null;
  const start =
    Math.sign(pending - position) === Math.sign(delta) ? pending : position;
  const ahead = Math.max(viewport * 2, 400);
  return Math.max(
    0,
    position - ahead,
    Math.min(limit, position + ahead, start + delta),
  );
}

/** Map vertical wheels onto a native horizontal scroller without hijacking touch/zoom. */
export function installHorizontalWheel(element: HTMLElement): () => void {
  let frame = 0;
  let target = element.scrollLeft;
  let previous = 0;
  const stop = () => {
    cancelAnimationFrame(frame);
    frame = 0;
    target = element.scrollLeft;
  };
  const tick = (now: number) => {
    target = Math.max(
      0,
      Math.min(target, element.scrollWidth - element.clientWidth),
    );
    const next = dampedPosition(
      element.scrollLeft,
      target,
      Math.min(64, now - previous),
    );
    previous = now;
    // Layout dimensions are integers while scrollLeft can be fractional at browser zoom.
    const done = Math.abs(next - target) <= 1;
    element.scrollTo({ left: done ? target : next, behavior: "instant" });
    if (done) stop();
    else frame = requestAnimationFrame(tick);
  };
  function wheel(event: WheelEvent) {
    if (
      event.defaultPrevented ||
      !event.cancelable ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
    ) {
      stop();
      return;
    }
    const delta = Math.max(
      -600,
      Math.min(
        600,
        wheelDistance(event.deltaY, event.deltaMode, element.clientWidth),
      ),
    );
    const next = horizontalTarget(
      element.scrollLeft,
      frame ? target : element.scrollLeft,
      delta,
      element.scrollWidth - element.clientWidth,
      element.clientWidth,
    );
    if (next === null) {
      stop();
      return;
    }
    event.preventDefault();
    stopScrolling();
    target = next;
    if (!motionEnabled()) {
      element.scrollTo({ left: target, behavior: "instant" });
      return;
    }
    if (!frame) {
      previous = performance.now();
      frame = requestAnimationFrame(tick);
    }
  }
  element.addEventListener("wheel", wheel, { passive: false });
  element.addEventListener("pointerdown", stop, { passive: true });
  element.addEventListener("touchstart", stop, { passive: true });
  element.addEventListener("keydown", stop);
  const unsubscribe = subscribeMotion(stop);
  return () => {
    stop();
    unsubscribe();
    element.removeEventListener("wheel", wheel);
    element.removeEventListener("pointerdown", stop);
    element.removeEventListener("touchstart", stop);
    element.removeEventListener("keydown", stop);
  };
}
