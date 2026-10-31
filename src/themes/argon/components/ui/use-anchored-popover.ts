"use client";
import {
  useLayoutEffect,
  useRef,
  useState,
  type ToggleEvent,
  type KeyboardEvent,
} from "react";
import { placePopover } from "./select-model";

/** Native top-layer/light-dismiss with bounded positioning inside dialogs and popovers. */
export function useAnchoredPopover(minWidth = 180) {
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const close = () => {
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  };
  useLayoutEffect(() => {
    if (!open || !trigger.current || !panel.current) return;
    const position = () => {
      if (!trigger.current || !panel.current) return;
      const bounds = trigger.current.getBoundingClientRect();
      if (bounds.bottom <= 0 || bounds.top >= window.innerHeight) {
        panel.current.hidePopover();
        return;
      }
      const placement = placePopover(
        bounds,
        {
          width: document.documentElement.clientWidth,
          height: window.innerHeight,
        },
        { width: minWidth, height: panel.current.scrollHeight },
      );
      for (const [key, value] of Object.entries(placement)) {
        panel.current.style[key as "left" | "top" | "width" | "maxHeight"] =
          `${value}px`;
      }
    };
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
  }, [open, minWidth]);
  return {
    trigger,
    panel,
    open,
    close,
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
