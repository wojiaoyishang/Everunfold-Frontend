"use client";
import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import { afterDialogMotion } from "./dialog-motion";

/** Keep the native modal and its focus containment alive through its exit. */
export function useDialogDismiss(dialog: RefObject<HTMLDialogElement | null>) {
  const [closing, setClosing] = useState(false);
  const action = useRef<(() => void) | null>(null);
  useLayoutEffect(() => {
    if (!closing) return;
    return afterDialogMotion(dialog.current, () => action.current?.());
  }, [closing, dialog]);
  const dismiss = (complete: () => void) => {
    if (action.current) return;
    action.current = complete;
    setClosing(true);
  };
  return { closing, dismiss };
}
