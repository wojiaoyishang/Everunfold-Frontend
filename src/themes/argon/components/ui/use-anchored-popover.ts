"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  useCallback,
  useSyncExternalStore,
  type ToggleEvent,
  type KeyboardEvent,
} from "react";
import { placePopover } from "./select-model";

const noSubscription = () => () => {};

/** Native top-layer/light-dismiss with bounded positioning inside dialogs and popovers. */
export function useAnchoredPopover(minWidth = 180, overlapAnchor = false) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const ready = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  const close = () => {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  };
  const position = useCallback(() => {
    if (!trigger.current || !panel.current?.matches(":popover-open")) return;
    const bounds = trigger.current.getBoundingClientRect();
    if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
      panel.current.hidePopover();
      return;
    }
    const viewport = {
      width: document.documentElement.clientWidth,
      height: window.innerHeight,
    };
    // Measure wrapped content at its final width, while the panel is still hidden.
    panel.current.style.width = `${placePopover(bounds, viewport, { width: minWidth, height: 0 }).width}px`;
    const placement = placePopover(bounds, viewport, {
      width: minWidth,
      height: panel.current.scrollHeight,
    });
    if (overlapAnchor && panel.current.scrollHeight > placement.maxHeight) {
      const height = Math.min(panel.current.scrollHeight, viewport.height - 24);
      placement.top = Math.max(
        12,
        Math.min(bounds.bottom + 6, viewport.height - height - 12),
      );
      placement.maxHeight = viewport.height - 24;
    }
    for (const [key, value] of Object.entries(placement)) {
      panel.current.style[key as "left" | "top" | "width" | "maxHeight"] =
        `${value}px`;
    }
    panel.current.dataset.positioned = "true";
  }, [minWidth, overlapAnchor]);
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    position();
    window.addEventListener("resize", position);
    window.addEventListener("scroll", position, true);
    const observer = new ResizeObserver(position);
    observer.observe(trigger.current);
    observer.observe(panel.current);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", position);
      window.removeEventListener("scroll", position, true);
    };
  }, [open, position]);
  return {
    trigger,
    panel,
    open,
    ready,
    close,
    onBeforeToggle: (event: ToggleEvent<HTMLDivElement>) => {
      if (event.newState !== "open") return;
      event.currentTarget.dataset.positioned = "false";
      // Native opening completes before this microtask; no unpositioned frame is painted.
      queueMicrotask(position);
    },
    onPanelKeyDown: (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      close();
    },
    onToggle: (event: ToggleEvent<HTMLDivElement>) =>
      setOpen(event.newState === "open"),
  };
}
