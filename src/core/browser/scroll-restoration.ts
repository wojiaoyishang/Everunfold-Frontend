import { scrollToAnchor, stopScrolling } from "./scroll";

const positions = new Map<string, number>();
let sequence = 0;
let frozen = false;
let restore: { key: string; route: string } | null = null;
const route = () => window.location.pathname + window.location.search;
const key = () => window.history.state?.everunfoldScroll as string | undefined;

function stamp(): string {
  const value = `${Date.now()}-${++sequence}`;
  window.history.replaceState(
    { ...window.history.state, everunfoldScroll: value },
    "",
    window.location.href,
  );
  return value;
}

export function rememberScrollPosition(): void {
  positions.set(key() ?? stamp(), window.scrollY);
  if (positions.size > 80) positions.delete(positions.keys().next().value!);
  frozen = true;
}

export function releaseScrollPosition(): void {
  frozen = false;
}

/** Give same-document anchor entries their own scroll history too. */
export function navigateToAnchor(url: URL): boolean {
  rememberScrollPosition();
  if (!scrollToAnchor(url.hash)) {
    releaseScrollPosition();
    return false;
  }
  if (url.href !== window.location.href) {
    window.history.pushState({ ...window.history.state }, "", url.href);
    positions.set(stamp(), window.scrollY);
  }
  releaseScrollPosition();
  return true;
}

export function commitScrollPosition(): void {
  if (restore && restore.route === route()) {
    const position = positions.get(restore.key);
    if (position !== undefined)
      window.scrollTo({ top: position, behavior: "instant" });
    restore = null;
  } else {
    positions.set(stamp(), window.scrollY);
    if (window.location.hash) scrollToAnchor(window.location.hash);
  }
  frozen = false;
}

export function installScrollRestoration(): () => void {
  const previous = window.history.scrollRestoration;
  window.history.scrollRestoration = "manual";
  let lastRoute = route();
  let frame = 0;
  function onScroll() {
    if (frozen) return;
    positions.set(key() ?? stamp(), window.scrollY);
    lastRoute = route();
  }
  function onPop(event: PopStateEvent) {
    stopScrolling();
    const saved = event.state?.everunfoldScroll;
    restore = saved ? { key: saved, route: route() } : null;
    frozen = true;
    if (route() === lastRoute) {
      frame = requestAnimationFrame(() => {
        commitScrollPosition();
      });
    }
    lastRoute = route();
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("popstate", onPop);
  return () => {
    cancelAnimationFrame(frame);
    window.removeEventListener("scroll", onScroll);
    window.removeEventListener("popstate", onPop);
    window.history.scrollRestoration = previous;
    frozen = false;
  };
}
