"use client";

import { useEffect, useMemo, useRef } from "react";
import { stopScrolling } from "@/core/browser/scroll";

/** Native dialog supplies focus trapping, Escape, and focus restoration. */
export function useModalDialog() {
  const dialog = useRef<HTMLDialogElement>(null);
  const previousOverflow = useRef<string | null>(null);
  useEffect(() => {
    const element = dialog.current;
    function release() {
      if (previousOverflow.current !== null) {
        document.body.style.overflow = previousOverflow.current;
        previousOverflow.current = null;
      }
    }
    element?.addEventListener("close", release);
    return () => {
      element?.removeEventListener("close", release);
      release();
    };
  }, []);
  return useMemo(
    () => ({
      dialog,
      open() {
        if (!dialog.current || dialog.current.open) return;
        stopScrolling();
        previousOverflow.current = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        dialog.current.showModal();
      },
      close() {
        dialog.current?.close();
      },
    }),
    [],
  );
}
