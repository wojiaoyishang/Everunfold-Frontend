"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ContentFeatures } from "@/core/rendering/features/model";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";
import { ContentMarkupView } from "./content-markup-view";

const GlossaryTooltips = lazy(() => import("./glossary-tooltips"));

export function ContentMarkup({
  html,
  features,
  className = "",
  contentId,
  contentRevision,
  glossary,
}: {
  html: string;
  features: ContentFeatures;
  className?: string;
  contentId?: string;
  contentRevision?: string;
  glossary?: GlossaryRuntimeOptions;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [loadGlossary, setLoadGlossary] = useState(false);
  useEffect(() => {
    if (
      !glossary?.auto_match ||
      !glossary.show_tooltips ||
      !contentId ||
      !contentRevision
    )
      return;
    let frame = 0;
    let timer: number | null = null;
    const start = () => setLoadGlossary(true);
    const idleWindow = window as Window & {
      requestIdleCallback?: Window["requestIdleCallback"];
      cancelIdleCallback?: Window["cancelIdleCallback"];
    };
    if (typeof idleWindow.requestIdleCallback === "function") {
      frame = idleWindow.requestIdleCallback(start, { timeout: 1200 });
      return () => idleWindow.cancelIdleCallback?.(frame);
    }
    timer = window.setTimeout(start, 350);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
    };
  }, [
    contentId,
    contentRevision,
    glossary?.auto_match,
    glossary?.show_tooltips,
  ]);
  return (
    <>
      <ContentMarkupView
        containerRef={root}
        html={html}
        features={features}
        className={className}
        data-glossary-enabled={Boolean(
          glossary?.auto_match && glossary.show_tooltips && contentId,
        )}
        data-glossary-loaded={loadGlossary}
      />
      {loadGlossary && glossary && contentId && contentRevision && (
        <Suspense fallback={null}>
          <GlossaryTooltips
            root={root}
            contentId={contentId}
            revision={contentRevision}
            options={glossary}
          />
        </Suspense>
      )}
    </>
  );
}
