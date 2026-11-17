"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "@/themes/argon/components/ui/primitives";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Icon } from "./icon";

/** Shared measured disclosure for long moments and comments; media can resize it. */
export function CollapsibleContent({
  children,
  limit = 380,
  previewRatio,
}: {
  children: ReactNode;
  limit?: number;
  previewRatio?: number;
}) {
  const id = useId();
  const inner = useRef<HTMLDivElement>(null);
  const [measurement, setMeasurement] = useState<{
    height: number;
    limit: number;
  } | null>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const element = inner.current;
    if (!element) return;
    const measure = () =>
      setMeasurement({
        height: element.scrollHeight,
        limit: previewRatio
          ? Math.min(limit, Math.round(element.clientWidth * previewRatio))
          : limit,
      });
    const observer = new ResizeObserver(measure);
    measure();
    observer.observe(element);
    return () => observer.disconnect();
  }, [limit, previewRatio]);
  const long =
    measurement !== null && measurement.height > measurement.limit + 2;
  const folded = long && !expanded;
  return (
    <div className="foldable-content" data-folded={folded}>
      <div
        id={id}
        className="foldable-window"
        onFocusCapture={() => {
          if (folded) setExpanded(true);
        }}
        style={{
          maxHeight:
            measurement === null
              ? previewRatio
                ? `min(${limit}px, ${previewRatio * 100}cqi)`
                : limit
              : folded
                ? measurement.limit
                : measurement.height + 2,
        }}
      >
        <div ref={inner}>{children}</div>
      </div>
      <noscript>
        <style>{".foldable-window{max-height:none!important}"}</style>
      </noscript>
      {long && (
        <Button
          type="button"
          className="fold-toggle"
          aria-controls={id}
          aria-expanded={expanded}
          onClick={() => setExpanded((current) => !current)}
        >
          <Icon name={expanded ? "up" : "down"} />
          {expanded ? <UiText text="收起长内容" /> : <UiText text="展开全文" />}
        </Button>
      )}
    </div>
  );
}
