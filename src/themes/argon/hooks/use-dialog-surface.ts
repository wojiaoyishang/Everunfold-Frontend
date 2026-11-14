"use client";
import { useLayoutEffect, type RefObject } from "react";

/** Native top-layer dialog: contain focus, then restore its own trigger. */
export function useDialogSurface(
  dialogRef: RefObject<HTMLDialogElement | null>,
  initialFocus?: RefObject<HTMLElement | null>,
  returnFocus?: RefObject<HTMLElement | null>,
) {
  useLayoutEffect(() => {
    const dialog = dialogRef.current;
    const owner = dialog?.ownerDocument ?? document;
    const trigger = returnFocus?.current ?? owner.activeElement;
    dialog?.showModal();
    initialFocus?.current?.focus({ preventScroll: true });
    return () => {
      dialog?.close();
      if (trigger?.isConnected && "focus" in trigger)
        (trigger as HTMLElement).focus({ preventScroll: true });
    };
  }, [dialogRef, initialFocus, returnFocus]);
}
