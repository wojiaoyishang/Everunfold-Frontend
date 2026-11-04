"use client";
import {
  useEffect,
  useId,
  useLayoutEffect,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import type { CodePreferences } from "@/generated/settings-contract";
import { CodeFoldControl, CodeTools } from "../components/reader/code-tools";
function AttachedTools({
  block,
  defaults,
  wrapSetting,
  foldSlot,
}: {
  block: HTMLElement;
  defaults: CodePreferences;
  wrapSetting: string;
  foldSlot: HTMLElement | null;
}) {
  const [wrapped, setWrapped] = useState(
    wrapSetting === "inherit" ? (defaults.wrap ?? false) : wrapSetting === "on",
  );
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const fold = block.style.getPropertyValue("--code-fold-lines"),
    threshold = fold ? Number(fold) : (defaults.collapse_lines ?? 18);
  const canExpand = threshold > 0 && Number(block.dataset.lines) > threshold;
  useLayoutEffect(() => {
    block.setAttribute("data-wrap", wrapped ? "on" : "off");
    block.setAttribute("data-expanded", String(expanded));
    block.setAttribute("data-code-foldable", String(canExpand && !!foldSlot));
    const pre = block.querySelector("pre");
    if (pre) pre.id = contentId;
    return () => {
      block.removeAttribute("data-code-foldable");
      if (pre?.id === contentId) pre.removeAttribute("id");
    };
  }, [block, wrapped, expanded, canExpand, foldSlot, contentId]);
  useLayoutEffect(() => {
    const pre = block.querySelector("pre"),
      code = pre?.querySelector("code");
    if (!pre || !code) return;
    const measure = () => {
      if (!block.isConnected) return;
      block.style.setProperty(
        "--code-full-size",
        Math.ceil(code.getBoundingClientRect().height + 64) + "px",
      );
      const rows = code.querySelectorAll<HTMLElement>(".code-line");
      if (!threshold || (rows.length && rows.length <= threshold)) {
        block.style.setProperty("--code-measured-fold-size", "none");
      } else if (rows.length) {
        const padding = getComputedStyle(pre);
        const height =
          rows[threshold - 1].getBoundingClientRect().bottom -
          code.getBoundingClientRect().top +
          parseFloat(padding.paddingTop) +
          Math.max(0, pre.offsetHeight - pre.clientHeight);
        block.style.setProperty(
          "--code-measured-fold-size",
          Math.ceil(height) + "px",
        );
      }
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? undefined
        : new ResizeObserver(measure);
    observer?.observe(code);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      block.style.removeProperty("--code-measured-fold-size");
      block.style.removeProperty("--code-full-size");
    };
  }, [block, threshold, wrapped]);
  return (
    <>
      <CodeTools
        code={JSON.parse(block.dataset.codeSource ?? '""')}
        wrapped={wrapped}
        onWrap={() => setWrapped(!wrapped)}
      />
      {canExpand &&
        foldSlot &&
        createPortal(
          <CodeFoldControl
            expanded={expanded}
            contentId={contentId}
            onToggle={() => setExpanded(!expanded)}
          />,
          foldSlot,
        )}
    </>
  );
}
/** Portals enhance opaque sanitized body HTML, never a live editor document. */
export function useCodeTools(
  container: RefObject<HTMLDivElement | null>,
  revision: string,
  defaults: CodePreferences,
) {
  const [slots, setSlots] = useState<
    {
      block: HTMLElement;
      slot: HTMLElement;
      foldSlot: HTMLElement | null;
      wrapSetting: string;
    }[]
  >([]);
  useEffect(() => {
    const next = Array.from(
      container.current?.querySelectorAll<HTMLElement>("[data-code-frame]") ??
        [],
    ).flatMap((block) => {
      const slot = block.querySelector<HTMLElement>("[data-code-tools]");
      return slot
        ? [
            {
              block,
              slot,
              foldSlot: block.querySelector<HTMLElement>(
                "[data-code-fold-tools]",
              ),
              wrapSetting: block.dataset.wrap ?? "inherit",
            },
          ]
        : [];
    });
    const frame = requestAnimationFrame(() => setSlots(next));
    return () => cancelAnimationFrame(frame);
  }, [container, revision]);
  return slots
    .filter(({ slot }) => slot.isConnected)
    .map(({ block, slot, foldSlot, wrapSetting }, index) =>
      createPortal(
        <AttachedTools
          key={revision + JSON.stringify(defaults)}
          block={block}
          defaults={defaults}
          wrapSetting={wrapSetting}
          foldSlot={foldSlot}
        />,
        slot,
        `code-${index}`,
      ),
    );
}
