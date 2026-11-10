"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";

/**
 * A language mark keeps a fixed slot. If a custom mark is wider than that slot,
 * it pans inside the slot on hover instead of stretching menus and form rows.
 */
export function LanguageFlag({
  value,
  size = "inline",
  className = "",
}: {
  value: string;
  size?: "inline" | "compact" | "large";
  className?: string;
}) {
  const viewport = useRef<HTMLSpanElement>(null);
  const content = useRef<HTMLSpanElement>(null);
  const [distance, setDistance] = useState(0);

  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const measure = () =>
      setDistance(Math.max(0, element.scrollWidth - element.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    if (content.current) observer.observe(content.current);
    let active = true;
    void document.fonts?.ready.then(() => {
      if (active) measure();
    });
    return () => {
      active = false;
      observer.disconnect();
    };
  }, [value, size]);

  return (
    <span
      ref={viewport}
      className={`language-flag ${className}`}
      data-size={size}
      data-scrollable={distance > 0}
      style={
        {
          "--language-flag-distance": `${distance}px`,
        } as CSSProperties
      }
      title={value}
      aria-hidden="true"
    >
      <span ref={content} className="language-flag-content">
        {value}
      </span>
    </span>
  );
}
