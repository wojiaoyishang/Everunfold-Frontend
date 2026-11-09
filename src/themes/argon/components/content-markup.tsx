"use client";
import { useEffect, useRef } from "react";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { ContentResources } from "./content-resources";
import {
  codeFontFace,
  codePreferenceStyle,
  useCodePreferences,
} from "./code-preferences";
import { useCodeTools } from "../hooks/use-code-tools";
import { ThemeCodeFont } from "@/core/fonts/provider";

export function ContentMarkup({
  html,
  features,
  className = "",
}: {
  html: string;
  features: ContentFeatures;
  className?: string;
}) {
  const root = useRef<HTMLDivElement>(null);
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
        data-code-light={preferences.light_scheme ?? "paper"}
        data-code-dark={preferences.dark_scheme ?? "slate"}
        data-code-numbers={preferences.line_numbers !== false}
        data-code-wrap-default={preferences.wrap ?? false}
        style={features.code ? codePreferenceStyle(preferences) : undefined}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {tools}
    </>
  );
}
