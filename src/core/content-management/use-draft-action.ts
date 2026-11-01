"use client";
import { useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { restoreDraft, trashDraft } from "@/generated/content-admin-client";
import type { DraftSummary } from "@/generated/content-admin-contract";
import { draftError, uncertainWrite } from "./draft-state";

export function useDraftAction(item: DraftSummary) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const operationId = useRef<string | null>(null);
  const [error, setError] = useState("");
  return {
    error,
    run: async () => {
      operationId.current ??= crypto.randomUUID();
      setError("");
      try {
        const action = item.status === "trash" ? restoreDraft : trashDraft;
        await action(
          baseUrl,
          {
            id: item.id,
            expected_revision: item.revision,
            operation_id: operationId.current,
          },
          csrfToken,
        );
        return true;
      } catch (reason) {
        setError(
          uncertainWrite(reason)
            ? "操作结果尚未确认，请重试或关闭后刷新列表。"
            : draftError(reason),
        );
        return false;
      }
    },
  };
}
