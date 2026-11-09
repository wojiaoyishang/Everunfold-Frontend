"use client";
import { useEffect } from "react";
import { scrollToAnchor } from "@/core/browser/scroll";

/** Locate after pagination and page layout settle; cancel when this request is superseded. */
export function useCommentLocation(
  target: { id: string } | null,
  page: number,
) {
  useEffect(() => {
    if (!target) return;
    const controller = new AbortController();
    let disposed = false;
    let element: HTMLElement | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const frame = requestAnimationFrame(() => {
      element = document.getElementById(target.id);
      if (!element) return;
      scrollToAnchor(
        `#${encodeURIComponent(target.id)}`,
        () => {
          if (disposed || !element?.isConnected) return;
          const composer = target.id === "comment-composer";
          const focus = composer ? element.querySelector("textarea") : element;
          focus?.focus({ preventScroll: true });
          if (composer) return;
          element.dataset.located = "true";
          timer = setTimeout(() => {
            if (element) delete element.dataset.located;
          }, 2000);
        },
        controller.signal,
      );
    });
    return () => {
      disposed = true;
      controller.abort();
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      if (element) delete element.dataset.located;
    };
  }, [target, page]);
}
