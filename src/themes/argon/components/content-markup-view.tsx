"use client";

import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  type HTMLAttributes,
  type RefObject,
} from "react";

import { mountShortcodeScripts } from "@/core/shortcodes/scripts";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { ThemeCodeFont } from "@/core/fonts/provider";
import { useCodeTools } from "../hooks/use-code-tools";
import { ContentResources } from "./content-resources";
import {
  codeFontFace,
  codePreferenceStyle,
  useCodePreferences,
} from "./code-preferences";

const ShortcodeRegions = lazy(() =>
  import("./shortcode-regions").then((module) => ({
    default: module.ShortcodeRegions,
  })),
);

type ContentMarkupViewProps = Omit<
  HTMLAttributes<HTMLDivElement>,
  "children" | "dangerouslySetInnerHTML"
> & {
  html: string;
  features: ContentFeatures;
  containerRef?: RefObject<HTMLDivElement | null>;
  codeTools?: boolean;
  preview?: boolean;
};

/** Shared safe body rendering and on-demand code/formula enhancement. */
export function ContentMarkupView({
  html,
  features,
  containerRef,
  codeTools = true,
  preview = false,
  className = "",
  style,
  ...attributes
}: ContentMarkupViewProps) {
  const localRoot = useRef<HTMLDivElement>(null);
  const root = containerRef ?? localRoot;
  const preferences = useCodePreferences();
  const tools = useCodeTools(root, html, preferences);
  const font = features.code ? codeFontFace(preferences) : "";

  useEffect(() => {
    const container = root.current;
    if (container && !preview) return mountShortcodeScripts(container);
  }, [html, preview, root]);

  useEffect(() => {
    const container = root.current;
    if (!container) return;
    for (const table of container.querySelectorAll<HTMLTableElement>("table")) {
      if (table.closest(".rich-table-scroll")) continue;
      const scroll = document.createElement("div");
      scroll.className = "rich-table-scroll";
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", "可横向滚动的正文表格");
      scroll.tabIndex = 0;
      table.before(scroll);
      scroll.append(table);
    }
  }, [html, root]);

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
  }, [features.code, features.math, html, root]);

  return (
    <>
      <ContentResources features={features} />
      {features.code && !font && <ThemeCodeFont />}
      {font && (
        <style data-code-font dangerouslySetInnerHTML={{ __html: font }} />
      )}
      <div
        {...attributes}
        ref={root}
        className={className}
        data-content-features
        data-code-light={preferences.light_scheme ?? "paper"}
        data-code-dark={preferences.dark_scheme ?? "slate"}
        data-code-numbers={preferences.line_numbers !== false}
        data-code-wrap-default={preferences.wrap ?? false}
        style={{
          ...(features.code ? codePreferenceStyle(preferences) : {}),
          ...style,
        }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {!preview && html.includes("data-shortcode-region=") && (
        <Suspense fallback={null}>
          <ShortcodeRegions root={root} html={html} />
        </Suspense>
      )}
      {codeTools ? tools : null}
    </>
  );
}
