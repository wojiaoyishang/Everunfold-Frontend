import { dampedPosition, easeOutExpo, wheelDistance } from "./scroll-policy";
import { motionEnabled, subscribeMotion } from "./motion";

let cancelAnimation: (() => void) | undefined;
let wheelTarget: number | undefined;

export function stopScrolling(): void {
  cancelAnimation?.();
  cancelAnimation = undefined;
  wheelTarget = undefined;
}

export function scrollToPosition(
  top: number,
  duration = 650,
): Promise<boolean> {
  stopScrolling();
  const start = window.scrollY;
  const limit = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const target = Math.max(0, Math.min(top, limit));
  if (Math.abs(target - start) < 1 || !motionEnabled()) {
    window.scrollTo({ top: target, behavior: "instant" });
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const began = performance.now();
    let frame = 0;
    const finish = (arrived = false) => {
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.scrollAnimating;
      resolve(arrived);
    };
    cancelAnimation = finish;
    document.documentElement.dataset.scrollAnimating = "true";
    const tick = (now: number) => {
      const progress = Math.min(1, (now - began) / duration);
      window.scrollTo({
        top: start + (target - start) * easeOutExpo(progress),
        behavior: "instant",
      });
      if (progress < 1) frame = requestAnimationFrame(tick);
      else {
        cancelAnimation = undefined;
        wheelTarget = undefined;
        finish(true);
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

export function scrollToAnchor(hash: string, onArrive?: () => void): boolean {
  let id: string;
  try {
    id = decodeURIComponent(hash.slice(1));
  } catch {
    return false;
  }
  const target = document.getElementById(id);
  if (!target) return false;
  for (
    let parent = target.parentElement;
    parent;
    parent = parent.parentElement
  ) {
    if (parent instanceof HTMLDetailsElement) parent.open = true;
  }
  const top = target.getBoundingClientRect().top + window.scrollY - 100;
  void scrollToPosition(top, 650).then((arrived) => {
    if (arrived && target.isConnected) onArrive?.();
  });
  return true;
}

function nativeScrollTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (
    target.closest(
      "input, textarea, select, [contenteditable='true'], dialog, [popover], [data-native-scroll], pre",
    )
  )
    return true;
  for (
    let element: Element | null = target;
    element && element !== document.body;
    element = element.parentElement
  ) {
    if (
      element.scrollHeight > element.clientHeight + 1 &&
      /auto|scroll/.test(getComputedStyle(element).overflowY)
    )
      return true;
  }
  return getComputedStyle(document.body).overflowY === "hidden";
}

/** One listener owns wheel interpolation; it never transforms the document/scroller. */
export function installScrollBehavior(
  navigateAnchor: (url: URL) => boolean,
): () => void {
  let wheelActive = false;
  function beginWheel() {
    stopScrolling();
    wheelActive = true;
    let position = window.scrollY;
    let previousTime = performance.now();
    let frame = 0;
    wheelTarget = position;
    const finish = () => {
      cancelAnimationFrame(frame);
      wheelActive = false;
      wheelTarget = undefined;
      cancelAnimation = undefined;
      delete document.documentElement.dataset.scrollAnimating;
    };
    cancelAnimation = finish;
    document.documentElement.dataset.scrollAnimating = "wheel";
    const tick = (now: number) => {
      const limit = Math.max(
        0,
        document.documentElement.scrollHeight - window.innerHeight,
      );
      const target = Math.max(0, Math.min(wheelTarget ?? position, limit));
      position = dampedPosition(
        position,
        target,
        Math.min(64, now - previousTime),
      );
      previousTime = now;
      const done = Math.abs(position - target) < 0.5;
      window.scrollTo({ top: done ? target : position, behavior: "instant" });
      if (done) finish();
      else frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  function onWheel(event: WheelEvent) {
    if (
      event.defaultPrevented ||
      !event.cancelable ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
      !motionEnabled() ||
      nativeScrollTarget(event.target)
    ) {
      stopScrolling();
      return;
    }
    const delta = Math.max(
      -600,
      Math.min(
        600,
        wheelDistance(event.deltaY, event.deltaMode, window.innerHeight),
      ),
    );
    if (!delta) return;
    if (!wheelActive) beginWheel();
    const previous = wheelTarget ?? window.scrollY;
    const sameDirection =
      Math.sign(previous - window.scrollY) === Math.sign(delta);
    const target = (sameDirection ? previous : window.scrollY) + delta;
    event.preventDefault();
    wheelTarget = Math.max(
      0,
      window.scrollY - Math.max(window.innerHeight * 2, 1000),
      Math.min(
        target,
        window.scrollY + Math.max(window.innerHeight * 2, 1000),
        document.documentElement.scrollHeight - window.innerHeight,
      ),
    );
  }
  function onAnchor(event: MouseEvent) {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      !(event.target instanceof Element)
    )
      return;
    const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
    if (
      !anchor ||
      anchor.download ||
      (anchor.target && anchor.target !== "_self")
    )
      return;
    const url = new URL(anchor.href, window.location.href);
    if (
      url.origin !== window.location.origin ||
      url.pathname !== window.location.pathname ||
      url.search !== window.location.search ||
      !url.hash
    )
      return;
    if (navigateAnchor(url)) {
      event.preventDefault();
    }
  }
  window.addEventListener("wheel", onWheel, { passive: false });
  window.addEventListener("touchstart", stopScrolling, { passive: true });
  window.addEventListener("pointerdown", stopScrolling, { passive: true });
  window.addEventListener("keydown", stopScrolling);
  window.addEventListener("popstate", stopScrolling);
  document.addEventListener("click", onAnchor);
  const unsubscribeMotion = subscribeMotion(stopScrolling);
  return () => {
    stopScrolling();
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", stopScrolling);
    window.removeEventListener("pointerdown", stopScrolling);
    window.removeEventListener("keydown", stopScrolling);
    window.removeEventListener("popstate", stopScrolling);
    document.removeEventListener("click", onAnchor);
    unsubscribeMotion();
  };
}
