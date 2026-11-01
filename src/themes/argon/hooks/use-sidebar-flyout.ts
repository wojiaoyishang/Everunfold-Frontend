"use client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ToggleEvent,
} from "react";
import { usePathname } from "next/navigation";

/** Public sidebar panels use the top layer, independently of editor/disclosure trees. */
export function useSidebarFlyout() {
  const row = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const leave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const path = usePathname();
  const cancelLeave = useCallback(() => {
    if (leave.current) clearTimeout(leave.current);
  }, []);
  const close = useCallback(() => {
    if (panel.current?.matches(":popover-open")) panel.current.hidePopover();
  }, []);
  const position = useCallback(() => {
    const popup = panel.current;
    const bounds = row.current?.getBoundingClientRect();
    if (!popup?.matches(":popover-open") || !bounds) return;
    const width = document.documentElement.clientWidth;
    const height = window.innerHeight;
    if (
      !bounds.width ||
      !bounds.height ||
      bounds.bottom < 0 ||
      bounds.top > height
    ) {
      close();
      return;
    }
    const popupWidth = Math.min(264, width - 24);
    popup.style.width = `${popupWidth}px`;
    const popupHeight = Math.min(popup.scrollHeight, height - 24);
    const right = bounds.right + 8;
    const left = bounds.left - popupWidth - 8;
    const side =
      right + popupWidth <= width - 12
        ? "right"
        : left >= 12
          ? "left"
          : "below";
    popup.dataset.side = side;
    popup.style.left = `${side === "right" ? right : side === "left" ? left : Math.max(12, Math.min(bounds.left, width - popupWidth - 12))}px`;
    popup.style.top = `${Math.max(12, Math.min(side === "below" ? bounds.bottom + 6 : bounds.top, height - popupHeight - 12))}px`;
    popup.style.maxHeight = `${height - 24}px`;
    popup.dataset.positioned = "true";
  }, [close]);
  const show = (focus = false) => {
    cancelLeave();
    panel.current?.showPopover();
    position();
    if (focus)
      panel.current
        ?.querySelector<HTMLElement>("a[href],button")
        ?.focus({ preventScroll: true });
  };
  useEffect(() => {
    close();
    return cancelLeave;
  }, [path, close, cancelLeave]);
  useLayoutEffect(() => {
    if (!open || !row.current || !panel.current) return;
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    const observer = new ResizeObserver(position);
    observer.observe(row.current);
    observer.observe(panel.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, position]);
  return {
    row,
    trigger,
    panel,
    open,
    show,
    close,
    cancelLeave,
    scheduleClose: () => {
      cancelLeave();
      leave.current = setTimeout(close, 180);
    },
    beforeToggle: (event: ToggleEvent<HTMLDivElement>) => {
      if (event.newState === "open") {
        event.currentTarget.dataset.positioned = "false";
        queueMicrotask(position);
      }
    },
    onToggle: (event: ToggleEvent<HTMLDivElement>) =>
      setOpen(event.newState === "open"),
  };
}
