import { easeOutExpo, isSteppedWheel, wheelDistance } from "./scroll-policy";

let cancelAnimation: (() => void) | undefined;
let wheelTarget: number | undefined;

export function stopScrolling(): void {
  cancelAnimation?.();
  cancelAnimation = undefined;
  wheelTarget = undefined;
}

export function scrollToPosition(top: number, duration = 650): Promise<void> {
  stopScrolling();
  const start = window.scrollY;
  const limit = Math.max(
    0,
    document.documentElement.scrollHeight - window.innerHeight,
  );
  const target = Math.max(0, Math.min(top, limit));
  if (
    Math.abs(target - start) < 1 ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    window.scrollTo({ top: target, behavior: "instant" });
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const began = performance.now();
    let frame = 0;
    const finish = () => {
      cancelAnimationFrame(frame);
      delete document.documentElement.dataset.scrollAnimating;
      resolve();
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
        finish();
      }
    };
    frame = requestAnimationFrame(tick);
  });
}

export function scrollToAnchor(hash: string): boolean {
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
  void scrollToPosition(top, 650);
  return true;
}

function nativeScrollTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return true;
  if (
    target.closest(
      "input, textarea, select, [contenteditable='true'], dialog, [data-native-scroll], pre",
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
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointer = window.matchMedia("(any-pointer: fine)");
  function onWheel(event: WheelEvent) {
    if (
      event.defaultPrevented ||
      !event.cancelable ||
      event.ctrlKey ||
      event.metaKey ||
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ||
      reduce.matches ||
      !pointer.matches ||
      nativeScrollTarget(event.target) ||
      !isSteppedWheel(event.deltaY, event.deltaMode)
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
    const previous = wheelTarget ?? window.scrollY;
    const sameDirection =
      Math.sign(previous - window.scrollY) === Math.sign(delta);
    const target = (sameDirection ? previous : window.scrollY) + delta;
    event.preventDefault();
    void scrollToPosition(target, 420);
    wheelTarget = Math.max(
      0,
      Math.min(
        target,
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
  reduce.addEventListener("change", stopScrolling);
  return () => {
    stopScrolling();
    window.removeEventListener("wheel", onWheel);
    window.removeEventListener("touchstart", stopScrolling);
    window.removeEventListener("pointerdown", stopScrolling);
    window.removeEventListener("keydown", stopScrolling);
    window.removeEventListener("popstate", stopScrolling);
    document.removeEventListener("click", onAnchor);
    reduce.removeEventListener("change", stopScrolling);
  };
}
