"use client";
import { randomUUID } from "@/core/browser/crypto";
import { useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  restoreDraft,
  trashDraft,
  restoreTranslationGroup,
  trashTranslationGroup,
} from "@/core/contracts/content-admin";
import type { DraftListItem } from "@/core/contracts/content-admin";
import { draftError, uncertainWrite } from "./draft-state";

export function useDraftAction(item: DraftListItem) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const operationId = useRef<string | null>(null);
  const [error, setError] = useState("");
  return {
    error,
    run: async () => {
      operationId.current ??= randomUUID();
      setError("");
      try {
        if (item.translations?.length) {
          await (
            item.status === "trash"
              ? restoreTranslationGroup
              : trashTranslationGroup
          )(
            baseUrl,
            {
              id: item.id,
              expected_revision: item.group_revision ?? 1,
              operation_id: operationId.current,
              members: Object.fromEntries(
                item.translations.map((member) => [member.id, member.revision]),
              ),
            },
            csrfToken,
          );
        } else {
          await (item.status === "trash" ? restoreDraft : trashDraft)(
            baseUrl,
            {
              id: item.id,
              expected_revision: item.revision,
              operation_id: operationId.current,
            },
            csrfToken,
          );
        }
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
