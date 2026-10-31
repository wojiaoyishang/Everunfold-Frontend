"use client";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";

/** Shared measured disclosure for long moments and comments; media can resize it. */
export function CollapsibleContent({
  children,
  limit = 380,
}: {
  children: ReactNode;
  limit?: number;
}) {
  const id = useId();
  const inner = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const element = inner.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.scrollHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  const long = height !== null && height > limit + 40;
  return (
    <div className="foldable-content" data-folded={long && !expanded}>
      <div
        id={id}
        className="foldable-window"
        onFocusCapture={() => {
          if (long && !expanded) setExpanded(true);
        }}
        style={{
          maxHeight:
            height === null
              ? undefined
              : long && !expanded
                ? limit
                : height + 2,
        }}
      >
        <div ref={inner}>{children}</div>
      </div>
      {long && (
        <button
          className="fold-toggle"
          aria-controls={id}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "收起长内容 ↑" : "展开全文 ↓"}
        </button>
      )}
    </div>
  );
}
