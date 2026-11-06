"use client";
import { useEffect } from "react";
import { requestEmbeddedLeave } from "@/core/preview/bridge";

/** Guard ordinary in-app links as well as the editor's explicit return action. */
export function useEditorNavigation(
  active: boolean,
  busy: boolean,
  request: (href: string) => void,
) {
  useEffect(() => {
    if (!active && !busy) return;
    const intercept = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return;
      const link =
        event.target instanceof Element
          ? event.target.closest<HTMLAnchorElement>("a[href]")
          : null;
      if (!link || link.target === "_blank" || link.hasAttribute("download"))
        return;
      const url = new URL(link.href, location.href);
      if (
        url.origin === location.origin &&
        url.pathname === location.pathname &&
        url.search === location.search
      )
        return;
      if (!["http:", "https:"].includes(url.protocol)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!busy && !requestEmbeddedLeave(url.href)) request(url.href);
    };
    document.addEventListener("click", intercept, true);
    return () => document.removeEventListener("click", intercept, true);
  }, [active, busy, request]);
}
