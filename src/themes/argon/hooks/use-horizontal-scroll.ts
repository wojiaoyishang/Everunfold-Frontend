"use client";
import { useEffect, useState, type RefObject } from "react";
import { adminScrollBehavior } from "@/core/admin/scroll";

/** Native scrolling keeps touch/trackpad support; buttons expose the same action to keyboards. */
export function useHorizontalScroll(
  track: RefObject<HTMLDivElement | null>,
  enabled: boolean,
  count: number,
) {
  const [edges, setEdges] = useState({ previous: false, next: false });
  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const measure = () => {
      const previous = enabled && element.scrollLeft > 2;
      const next =
        enabled &&
        element.scrollLeft + element.clientWidth < element.scrollWidth - 2;
      setEdges((current) =>
        current.previous === previous && current.next === next
          ? current
          : { previous, next },
      );
    };
    const frame = requestAnimationFrame(measure);
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    element.addEventListener("scroll", measure, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      element.removeEventListener("scroll", measure);
    };
  }, [track, enabled, count]);
  return {
    ...edges,
    move: (direction: -1 | 1) => {
      const element = track.current;
      if (element)
        element.scrollBy({
          left: direction * element.clientWidth * 0.85,
          behavior: adminScrollBehavior(element),
        });
    },
  };
}
