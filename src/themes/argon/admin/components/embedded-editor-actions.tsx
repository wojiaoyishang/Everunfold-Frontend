"use client";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
/** Move the existing authorized controls, retaining their editor state and action callbacks. */
export function EmbeddedEditorActions({ children }: { children: ReactNode }) {
  let target: Element | null = null;
  if (
    typeof window !== "undefined" &&
    window.parent !== window &&
    window.name.startsWith("everunfold-live-editor")
  ) {
    try {
      target = window.parent.document.querySelector(
        "[data-live-editor-actions]",
      );
    } catch {
      /* A different-origin parent cannot host private controls. */
    }
  }
  return target ? createPortal(children, target) : children;
}
