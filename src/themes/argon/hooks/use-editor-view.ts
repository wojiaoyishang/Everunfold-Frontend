"use client";
import { useEffect, useRef, useState } from "react";
import { afterDialogMotion } from "./dialog-motion";
/** Finish the outgoing view before replacing it, including reduced/cancelled motion. */
export function useEditorView<T extends string>(initial: T) {
  const [view, setView] = useState<T>(initial),
    [exiting, setExiting] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pending = useRef<{ value: T; done?: () => void } | null>(null);
  const focusPending = useRef(false);
  useEffect(() => {
    if (!focusPending.current || !ref.current || exiting) return;
    const target = ref.current;
    const focus = () => {
      const field = [
        ...target.querySelectorAll<HTMLElement>(
          '[role="textbox"][contenteditable="true"]',
        ),
      ].find((node) => !node.closest("[hidden],[inert]"));
      if (!field) return;
      field.focus({ preventScroll: true });
      focusPending.current = false;
      observer.disconnect();
    };
    const observer = new MutationObserver(focus);
    observer.observe(target, { childList: true, subtree: true });
    const frame = requestAnimationFrame(focus);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [view, exiting]);
  useEffect(() => {
    if (!exiting) return;
    return afterDialogMotion(ref.current, () => {
      const next = pending.current;
      pending.current = null;
      if (next) {
        setView(next.value);
        next.done?.();
      }
      setExiting(false);
    });
  }, [exiting]);
  return {
    view,
    ref,
    exiting,
    change: (value: T, done?: () => void) => {
      if (value === view) {
        done?.();
        return;
      }
      pending.current = { value, done };
      focusPending.current = true;
      setExiting(true);
    },
  };
}
