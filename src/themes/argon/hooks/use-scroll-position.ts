"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  let frame = 0;
  const onScroll = () => {
    if (!frame)
      frame = requestAnimationFrame(() => {
        frame = 0;
        listener();
      });
  };
  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(frame);
  };
}

export function useScrollPosition(): number {
  return useSyncExternalStore(
    subscribe,
    () => Math.round(window.scrollY),
    () => 0,
  );
}
