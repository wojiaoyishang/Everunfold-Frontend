"use client";

import { useEffect, type RefObject, type ReactNode } from "react";
import { useMotion } from "./use-motion";

/** Animate sanitized/native details without replacing their keyboard semantics. */
export function useDetailsMotion(
  container: RefObject<HTMLElement | null>,
  content: ReactNode,
) {
  const { enabled } = useMotion();
  useEffect(() => {
    const element = container.current;
    if (!element || !enabled) return;
    const running = new Map<
      HTMLDetailsElement,
      { animation: Animation; open: boolean; overflow: string }
    >();
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        !(event.target instanceof Element)
      )
        return;
      const summary = event.target.closest("summary");
      const details = summary?.parentElement;
      if (
        !(details instanceof HTMLDetailsElement) ||
        !element?.contains(details) ||
        event.target.closest("a, button, input")
      )
        return;
      event.preventDefault();
      const previous = running.get(details);
      const open = !(previous?.open ?? details.open);
      const from = details.getBoundingClientRect().height;
      const overflow = previous?.overflow ?? details.style.overflow;
      if (previous) {
        previous.animation.onfinish = null;
        previous.animation.cancel();
      }
      // Measure the natural destination before the next paint, including borders/padding.
      details.open = open;
      const to = details.getBoundingClientRect().height;
      details.open = true;
      details.style.overflow = "hidden";
      details.dataset.expanded = String(open);
      const animation = details.animate(
        [{ height: `${from}px` }, { height: `${to}px` }],
        {
          duration: 360,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "both",
        },
      );
      running.set(details, { animation, open, overflow });
      animation.onfinish = () => {
        details.open = open;
        details.style.overflow = overflow;
        delete details.dataset.expanded;
        running.delete(details);
        animation.cancel();
      };
    }
    element.addEventListener("click", onClick);
    return () => {
      element.removeEventListener("click", onClick);
      for (const [details, state] of running) {
        state.animation.onfinish = null;
        state.animation.cancel();
        details.open = state.open;
        details.style.overflow = state.overflow;
        delete details.dataset.expanded;
      }
    };
  }, [container, content, enabled]);
}
