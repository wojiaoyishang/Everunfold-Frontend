"use client";

import { useId } from "react";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { useT } from "@/core/i18n/provider";
import type { ToastTone } from "./store";
import { useToast } from "./toast-provider";

export function useToastFeedback(inDialog = false) {
  const toast = useToast();
  const id = useId();
  const t = useT();
  return (message: string, tone: ToastTone = "error") =>
    toast.show({
      id,
      title: t(message),
      tone,
      placement: inDialog ? undefined : "top-center",
      countdown: true,
      duration: tone === "error" ? 7500 : 4500,
    });
}

export function useToastAction(failure = accountFailure, inDialog = false) {
  const notify = useToastFeedback(inDialog);
  const action = useAccountAction((error) => {
    notify(failure(error));
    return "";
  });
  return {
    busy: action.busy,
    operation: action.operation,
    notify,
    async run(
      work: (signal: AbortSignal) => Promise<void>,
      success = "已保存。",
    ) {
      const completed = await action.run(work, "");
      if (completed && success) notify(success, "success");
      return completed;
    },
  };
}
