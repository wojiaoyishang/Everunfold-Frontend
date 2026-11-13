"use client";

import { useEffect, useEffectEvent, useId, useRef, useState } from "react";
import { useAccountAction } from "@/core/accounts/use-action";
import { useT } from "@/core/i18n/provider";
import { pagesFailure } from "@/core/pages/failure";
import { useToast } from "../../components/ui/toast/toast-provider";
import type { ToastTone } from "../../components/ui/toast/store";

export function usePageFeedback() {
  const toast = useToast();
  const id = useId();
  const t = useT();
  return (message: string, tone: ToastTone = "error") =>
    toast.show({
      id,
      title: t(message),
      tone,
      placement: "top-center",
      countdown: true,
      duration: tone === "error" ? 7500 : 4500,
    });
}

export function usePageErrorToast(error: string) {
  const notify = usePageFeedback();
  const report = useEffectEvent((message: string) => notify(message));
  useEffect(() => {
    if (error) report(error);
  }, [error]);
}

export function usePageAction(failure = pagesFailure) {
  const notify = usePageFeedback();
  const inline = useRef(false);
  const [dialogError, setDialogError] = useState("");
  const action = useAccountAction((error) => {
    const message = failure(error);
    if (inline.current) setDialogError(message);
    else notify(message);
    return "";
  });
  return {
    busy: action.busy,
    operation: action.operation,
    notify,
    dialogError,
    clearDialogError: () => setDialogError(""),
    async run(work: (signal: AbortSignal) => Promise<void>, success?: string) {
      const completed = await action.run(work, "");
      if (completed && success) notify(success, "success");
      return completed;
    },
    async runInDialog(work: (signal: AbortSignal) => Promise<void>) {
      inline.current = true;
      setDialogError("");
      try {
        return await action.run(work, "");
      } finally {
        inline.current = false;
      }
    },
  };
}
