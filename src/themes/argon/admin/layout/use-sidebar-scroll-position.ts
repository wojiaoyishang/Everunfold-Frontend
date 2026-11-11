"use client";

import { useEffect, type RefObject } from "react";
import { parseAdminSidebarScroll } from "@/core/admin/sidebar-scroll";

export function useSidebarScrollPosition(
  sidebar: RefObject<HTMLElement | null>,
  storageKey: string,
) {
  useEffect(() => {
    const node = sidebar.current;
    if (!node) return;
    let ready = false;
    let frame = 0;
    let restoreFrame = 0;

    const save = () => {
      if (!ready || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        try {
          sessionStorage.setItem(storageKey, String(node.scrollTop));
        } catch {
          // Storage can be unavailable in hardened/private browser contexts.
        }
      });
    };

    restoreFrame = requestAnimationFrame(() => {
      let stored: number | null = null;
      try {
        stored = parseAdminSidebarScroll(sessionStorage.getItem(storageKey));
      } catch {
        // Fall through to revealing the current destination.
      }
      if (stored !== null) node.scrollTop = stored;

      const current = node.querySelector<HTMLElement>(
        '.admin-navigation [aria-current="page"]',
      );
      if (current) {
        const viewport = node.getBoundingClientRect();
        const target = current.getBoundingClientRect();
        if (target.top < viewport.top + 8) {
          node.scrollTop -= viewport.top - target.top + 8;
        } else if (target.bottom > viewport.bottom - 8) {
          node.scrollTop += target.bottom - viewport.bottom + 8;
        }
      }
      ready = true;
    });

    node.addEventListener("scroll", save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(restoreFrame);
      node.removeEventListener("scroll", save);
    };
  }, [sidebar, storageKey]);
}
