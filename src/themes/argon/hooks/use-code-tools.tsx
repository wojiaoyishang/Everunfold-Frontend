"use client";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import type { CodePreferences } from "@/generated/settings-contract";
import { CodeTools } from "../components/reader/code-tools";
function AttachedTools({
  block,
  defaults,
}: {
  block: HTMLElement;
  defaults: CodePreferences;
}) {
  const [wrapped, setWrapped] = useState(
    block.dataset.wrap === "inherit"
      ? (defaults.wrap ?? false)
      : block.dataset.wrap === "on",
  );
  const [expanded, setExpanded] = useState(false);
  const fold = block.style.getPropertyValue("--code-fold-lines"),
    threshold = fold ? Number(fold) : (defaults.collapse_lines ?? 18);
  return (
    <CodeTools
      code={JSON.parse(block.dataset.codeSource ?? '""')}
      wrapped={wrapped}
      expanded={expanded}
      canExpand={threshold > 0 && Number(block.dataset.lines) > threshold}
      onWrap={() => {
        block.setAttribute("data-wrap", !wrapped ? "on" : "off");
        setWrapped(!wrapped);
      }}
      onExpand={() => {
        block.setAttribute("data-expanded", String(!expanded));
        setExpanded(!expanded);
      }}
    />
  );
}
/** Portals enhance opaque sanitized body HTML, never a live editor document. */
export function useCodeTools(
  container: RefObject<HTMLDivElement | null>,
  revision: string,
  defaults: CodePreferences,
) {
  const [slots, setSlots] = useState<
    { block: HTMLElement; slot: HTMLElement }[]
  >([]);
  useEffect(() => {
    const next = Array.from(
      container.current?.querySelectorAll<HTMLElement>("[data-code-frame]") ??
        [],
    ).flatMap((block) => {
      const slot = block.querySelector<HTMLElement>("[data-code-tools]");
      return slot ? [{ block, slot }] : [];
    });
    const frame = requestAnimationFrame(() => setSlots(next));
    return () => cancelAnimationFrame(frame);
  }, [container, revision]);
  return slots
    .filter(({ slot }) => slot.isConnected)
    .map(({ block, slot }, index) =>
      createPortal(
        <AttachedTools
          key={revision + JSON.stringify(defaults)}
          block={block}
          defaults={defaults}
        />,
        slot,
        `code-${index}`,
      ),
    );
}
