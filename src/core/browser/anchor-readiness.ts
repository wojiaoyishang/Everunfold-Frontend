/** Wait for layout-affecting resources, not analytics or long-lived connections. */
export function waitForAnchorLayout(
  target: HTMLElement,
  signal: AbortSignal,
  { quietMs = 300, timeoutMs = 15000 } = {},
): Promise<boolean> {
  return new Promise((resolve) => {
    const started = performance.now();
    const route = window.location.pathname + window.location.search;
    let stableSince = started;
    let previous: number[] | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let finished = false;
    const interactions = [
      "wheel",
      "touchstart",
      "pointerdown",
      "keydown",
      "popstate",
    ];
    function finish(ready: boolean) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      signal.removeEventListener("abort", cancel);
      interactions.forEach((type) => window.removeEventListener(type, cancel));
      resolve(ready);
    }
    function cancel() {
      finish(false);
    }
    function check() {
      const now = performance.now();
      if (
        signal.aborted ||
        !target.isConnected ||
        route !== window.location.pathname + window.location.search ||
        now - started >= timeoutMs
      ) {
        finish(false);
        return;
      }
      const bounds = target.getBoundingClientRect();
      const top = bounds.top + window.scrollY;
      const beforeTarget = (element: Element) =>
        element.getClientRects().length > 0 &&
        element.getBoundingClientRect().top + window.scrollY <= top;
      let waiting =
        document.readyState !== "complete" ||
        document.fonts?.status === "loading";
      for (const image of document.querySelectorAll<HTMLImageElement>(
        "img[src], img[srcset]",
      )) {
        if (!image.complete && beforeTarget(image)) {
          // An explicit jump below lazy images must not wait for a scroll that hasn't happened yet.
          if (image.loading === "lazy") image.loading = "eager";
          waiting = true;
        }
      }
      for (const element of document.querySelectorAll(
        '[data-anchor-pending="true"]',
      )) {
        if (beforeTarget(element)) waiting = true;
      }
      const position = [
        top,
        bounds.left,
        bounds.width,
        bounds.height,
        document.documentElement.scrollHeight,
      ];
      if (
        waiting ||
        !previous ||
        position.some(
          (value, index) => Math.abs(value - previous![index]) > 0.5,
        )
      ) {
        stableSince = now;
      }
      previous = position;
      if (!waiting && now - stableSince >= quietMs) {
        finish(true);
        return;
      }
      timer = setTimeout(check, Math.min(100, timeoutMs - (now - started)));
    }
    signal.addEventListener("abort", cancel, { once: true });
    interactions.forEach((type) =>
      window.addEventListener(type, cancel, { passive: true }),
    );
    check();
  });
}
