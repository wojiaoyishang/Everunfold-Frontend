"use client";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { ContentResources } from "./content-resources";
import {
  codeFontFace,
  codePreferenceStyle,
  useCodePreferences,
} from "./code-preferences";
import { useCodeTools } from "../hooks/use-code-tools";
import { ThemeCodeFont } from "@/core/fonts/provider";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";

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
  const preferences = useCodePreferences();
  const tools = useCodeTools(root, html, preferences);
  const font = features.code ? codeFontFace(preferences) : "";
  useEffect(() => {
    if (!features.code && !features.math) return;
    let active = true;
    const targets =
      root.current?.querySelectorAll<HTMLElement>(
        "pre > code:not([data-highlighted]), [data-math]:not([data-typeset])",
      ) ?? [];
    for (const node of targets) {
      if (
        node.tagName !== "CODE" &&
        (node.closest("pre,code") || node.parentElement?.closest("[data-math]"))
      )
        continue;
      const frame = node.closest<HTMLElement>("[data-code-frame]");
      const source: string =
        node.tagName === "CODE" && frame
          ? JSON.parse(frame.dataset.codeSource ?? '""')
          : (node.dataset.latex ?? node.textContent ?? "");
      const render =
        node.tagName === "CODE"
          ? import("@/core/rendering/features/code").then(
              async ({ highlightCode }) => {
                const highlighted = await highlightCode(
                  source,
                  /\blanguage-([\w+-]+)/.exec(node.className)?.[1] ??
                    "plaintext",
                );
                if (!frame || node.hasAttribute("data-code-plain"))
                  return highlighted;
                const { codeLineMarkup } =
                  await import("@/core/rendering/features/code-frame");
                const rows = [
                  ...node.querySelectorAll<HTMLElement>(".code-line"),
                ];
                return codeLineMarkup(
                  highlighted,
                  Number(rows[0]?.dataset.line ?? 1),
                  rows
                    .filter((row) => row.classList.contains("code-line-marked"))
                    .map((row) => row.dataset.line)
                    .join(","),
                );
              },
            )
          : import("@/core/rendering/features/math").then(
              ({ renderFormula }) =>
                renderFormula(source, node.dataset.math === "block").html,
            );
      void render
        .then((markup) => {
          if (!active || !node.isConnected) return;
          node.innerHTML = markup;
          if (node.tagName === "CODE") node.dataset.highlighted = "true";
          else node.dataset.typeset = "true";
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [html, features.code, features.math]);
  useEffect(() => {
    if (!glossary?.auto_match || !contentId || !contentRevision) return;
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
  }, [contentId, contentRevision, glossary?.auto_match]);
  return (
    <>
      <ContentResources features={features} />
      {features.code && !font && <ThemeCodeFont />}
      {font && (
        <style data-code-font dangerouslySetInnerHTML={{ __html: font }} />
      )}
      <div
        ref={root}
        className={className}
        data-content-features
        data-glossary-enabled={Boolean(glossary?.auto_match && contentId)}
        data-glossary-loaded={loadGlossary}
        data-code-light={preferences.light_scheme ?? "paper"}
        data-code-dark={preferences.dark_scheme ?? "slate"}
        data-code-numbers={preferences.line_numbers !== false}
        data-code-wrap-default={preferences.wrap ?? false}
        style={features.code ? codePreferenceStyle(preferences) : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
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
      {tools}
    </>
  );
}
