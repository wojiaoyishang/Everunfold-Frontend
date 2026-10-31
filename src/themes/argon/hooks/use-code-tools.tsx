"use client";
import { useEffect, useState, type RefObject } from "react";
import { createPortal } from "react-dom";
import { CodeTools } from "../components/reader/code-tools";

function AttachedTools({ block }: { block: HTMLPreElement }) {
  const [wrapped, setWrapped] = useState(false);
  const [expanded, setExpanded] = useState(false);
  return (
    <CodeTools
      code={block.textContent ?? ""}
      wrapped={wrapped}
      expanded={expanded}
      onWrap={() => {
        block.setAttribute("data-wrapped", String(!wrapped));
        setWrapped(!wrapped);
      }}
      onExpand={() => {
        block.setAttribute("data-expanded", String(!expanded));
        setExpanded(!expanded);
      }}
    />
  );
}

/** Only enhances server-rendered opaque HTML, never reparents React-owned nodes. */
export function useCodeTools(
  container: RefObject<HTMLDivElement | null>,
  revision: unknown,
) {
  const [slots, setSlots] = useState<
    { pre: HTMLPreElement; slot: HTMLDivElement }[]
  >([]);
  useEffect(() => {
    const elements = Array.from(
      container.current?.querySelectorAll<HTMLPreElement>(
        ".article-content pre",
      ) ?? [],
    );
    const next = elements.map((pre) => {
      const slot = document.createElement("div");
      slot.className = "attached-code-tools";
      pre.before(slot);
      pre.classList.add("enhanced-code");
      return { pre, slot };
    });
    const frame = requestAnimationFrame(() => setSlots(next));
    return () => {
      cancelAnimationFrame(frame);
      next.forEach(({ pre, slot }) => {
        slot.remove();
        pre.classList.remove("enhanced-code");
        delete pre.dataset.wrapped;
        delete pre.dataset.expanded;
      });
    };
  }, [container, revision]);
  return slots.map(({ pre, slot }, i) =>
    createPortal(<AttachedTools block={pre} />, slot, `code-${i}`),
  );
}
