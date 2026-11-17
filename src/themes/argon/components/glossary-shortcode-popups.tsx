"use client";

import { useContext, useEffect, useId, useState, type RefObject } from "react";
import {
  glossaryPopupData,
  glossaryTriggerSelector,
} from "@/core/shortcodes/glossary";
import type { RenderShortcodes } from "@/core/shortcodes/configuration";
import {
  GlossaryPopupScope,
  type GlossaryPopups,
} from "./glossary-popup-scope";
import GlossaryTooltips from "./glossary-tooltips";

export default function GlossaryShortcodePopups({
  root,
  revision,
  shortcodes,
}: {
  root: RefObject<HTMLElement | null>;
  revision?: string;
  shortcodes?: RenderShortcodes;
}) {
  const popupId = useId();
  const inherited = useContext(GlossaryPopupScope).popups;
  const [local, setLocal] = useState<{
    revision?: string;
    popups?: GlossaryPopups;
  }>();
  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      const source = root.current?.querySelector<HTMLScriptElement>(
        `:scope > script[${glossaryPopupData}]`,
      )?.textContent;
      if (!source) return;
      try {
        setLocal({ revision, popups: JSON.parse(source) as GlossaryPopups });
      } catch {
        setLocal({ revision });
      }
    });
    return () => {
      active = false;
    };
  }, [revision, root]);
  const popups =
    (local?.revision === revision ? local?.popups : undefined) ?? inherited;
  useEffect(() => {
    const target = root.current;
    if (!target || !popups) return;
    const decorated = new Set<HTMLElement>();
    const decorate = () => {
      for (const node of decorated)
        if (!target.contains(node)) decorated.delete(node);
      for (const node of target.querySelectorAll<HTMLElement>(
        glossaryTriggerSelector,
      )) {
        if (
          decorated.has(node) ||
          !Object.hasOwn(popups, node.dataset.glossaryPopup ?? "")
        )
          continue;
        node.dataset.glossaryInteractive = "";
        node.tabIndex = 0;
        node.setAttribute(
          "role",
          node.matches("div") ||
            node.querySelector(
              "a,button,summary,[tabindex],[data-glossary-popup]",
            )
            ? "group"
            : "button",
        );
        node.setAttribute("aria-haspopup", "dialog");
        node.setAttribute("aria-controls", popupId);
        node.setAttribute("aria-expanded", "false");
        decorated.add(node);
      }
    };
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(target, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      for (const node of decorated)
        for (const name of [
          "data-glossary-interactive",
          "tabindex",
          "role",
          "aria-haspopup",
          "aria-controls",
          "aria-expanded",
        ])
          node.removeAttribute(name);
    };
  }, [popupId, popups, revision, root]);
  if (!popups) return null;
  return (
    <GlossaryTooltips
      key={revision}
      root={root}
      popupId={popupId}
      triggerSelector={`${glossaryTriggerSelector}[data-glossary-interactive]`}
      authoredPopups={popups}
      shortcodes={shortcodes}
    />
  );
}
