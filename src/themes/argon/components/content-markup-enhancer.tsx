"use client";
import {
  lazy,
  Suspense,
  useEffect,
  useMemo,
  useState,
  type RefObject,
} from "react";
import type { ContentFeatures } from "@/core/rendering/features/model";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";
import { useCodeTools } from "../hooks/use-code-tools";
import {
  codeFontFace,
  codePreferenceStyle,
  useCodePreferences,
} from "./code-preferences";
import { ThemeCodeFont } from "@/core/fonts/provider";

const GlossaryTooltips = lazy(() => import("./glossary-tooltips"));
const GlossaryFootnotes = lazy(() => import("./glossary-footnotes"));

export function ContentMarkupEnhancer({
  targetId,
  features,
  contentId,
  revision,
  glossary,
  codeTools = true,
}: {
  targetId: string;
  features: ContentFeatures;
  contentId?: string;
  revision?: string;
  glossary?: GlossaryRuntimeOptions;
  codeTools?: boolean;
}) {
  const [target, setTarget] = useState<HTMLDivElement | null>(null);
  const root = useMemo<RefObject<HTMLDivElement | null>>(
    () => ({ current: target }),
    [target],
  );
  const preferences = useCodePreferences();
  const tools = useCodeTools(root, revision ?? "", preferences);
  const font = features.code ? codeFontFace(preferences) : "";
  const [loadGlossary, setLoadGlossary] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const node = document.getElementById(targetId);
      setTarget(node instanceof HTMLDivElement ? node : null);
    });
    return () => cancelAnimationFrame(frame);
  }, [targetId]);

  useEffect(() => {
    const node = document.getElementById(targetId);
    if (!node) return;
    node.dataset.contentFeatures = "";
    node.dataset.codeLight = preferences.light_scheme ?? "paper";
    node.dataset.codeDark = preferences.dark_scheme ?? "slate";
    node.dataset.codeNumbers = String(preferences.line_numbers !== false);
    node.dataset.codeWrapDefault = String(preferences.wrap ?? false);
    for (const [name, value] of Object.entries(
      codePreferenceStyle(preferences),
    ))
      if (typeof value === "string" || typeof value === "number")
        node.style.setProperty(name, String(value));
  }, [preferences, targetId, target]);

  useEffect(() => {
    if (!target) return;
    for (const table of target.querySelectorAll<HTMLTableElement>("table")) {
      if (table.closest(".rich-table-scroll")) continue;
      const scroll = document.createElement("div");
      scroll.className = "rich-table-scroll";
      scroll.setAttribute("role", "region");
      scroll.setAttribute("aria-label", "可横向滚动的正文表格");
      scroll.tabIndex = 0;
      table.before(scroll);
      scroll.append(table);
    }
  }, [revision, target]);

  useEffect(() => {
    if (!target || (!features.code && !features.math)) return;
    let active = true;
    const targets = target.querySelectorAll<HTMLElement>(
      "pre > code:not([data-highlighted]), [data-math]:not([data-typeset])",
    );
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
  }, [features.code, features.math, revision, target]);

  useEffect(() => {
    if (
      !target ||
      (!glossary?.auto_match && !glossary?.show_footnotes) ||
      !contentId ||
      !revision
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
    glossary?.auto_match,
    glossary?.show_footnotes,
    revision,
    target,
  ]);

  useEffect(() => {
    const node = document.getElementById(targetId);
    if (node) node.dataset.glossaryLoaded = String(loadGlossary);
  }, [loadGlossary, targetId]);

  return (
    <>
      {features.code && !font && <ThemeCodeFont />}
      {font && (
        <style data-code-font dangerouslySetInnerHTML={{ __html: font }} />
      )}
      {codeTools ? tools : null}
      {loadGlossary && glossary && contentId && revision && (
        <Suspense fallback={null}>
          {glossary.auto_match && (
            <GlossaryTooltips
              root={root}
              contentId={contentId}
              revision={revision}
              options={glossary}
            />
          )}
          {glossary.show_footnotes && (
            <GlossaryFootnotes contentId={contentId} revision={revision} />
          )}
        </Suspense>
      )}
    </>
  );
}
