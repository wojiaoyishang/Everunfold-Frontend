"use client";
import { useLayoutEffect, type RefObject } from "react";

/** Native top-layer dialog: contain focus, then restore its own trigger. */
export function useDialogSurface(
  dialogRef: RefObject<HTMLDialogElement | null>,
  initialFocus?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    initialFocus?.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, [dialogRef, initialFocus]);
}
