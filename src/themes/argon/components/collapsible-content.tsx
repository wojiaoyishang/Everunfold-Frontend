"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "@/themes/argon/components/ui/primitives";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";

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
            height === null ? limit : long && !expanded ? limit : height + 2,
        }}
      >
        <div ref={inner}>{children}</div>
      </div>
      <noscript>
        <style>{".foldable-window{max-height:none!important}"}</style>
      </noscript>
      {long && (
        <Button
          className="fold-toggle"
          aria-controls={id}
          aria-expanded={expanded}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? <UiText text="收起长内容" /> : <UiText text="展开全文" />}
          <Icon name={expanded ? "up" : "down"} />
        </Button>
      )}
    </div>
  );
}
