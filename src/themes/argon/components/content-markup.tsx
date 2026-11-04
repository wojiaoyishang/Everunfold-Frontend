"use client";
import { useEffect, useRef } from "react";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { ContentResources } from "./content-resources";

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
      const source = node.dataset.latex ?? node.textContent ?? "";
      const render =
        node.tagName === "CODE"
          ? import("@/core/rendering/features/code").then(({ highlightCode }) =>
              highlightCode(
                source,
                /\blanguage-([\w+-]+)/.exec(node.className)?.[1] ?? "plaintext",
              ),
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
      <div
        ref={root}
        className={className}
        data-content-features
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </>
  );
}
