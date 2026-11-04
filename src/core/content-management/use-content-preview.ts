"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { readDraft } from "@/generated/content-admin-client";
import type { DraftDetail } from "@/generated/content-admin-contract";
import { draftError } from "./draft-state";

/** Authorized, mounted-page state only. No public snapshots, recovery cache, or write requests. */
export function useContentPreview(type: string, id: string) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    key: string;
    detail?: DraftDetail;
    error?: string;
  }>();
  const key = `${baseUrl}:${csrfToken}:${type}:${id}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    void readDraft(baseUrl, { id }, csrfToken, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        if (data.type_id !== type || data.status === "trash")
          setResult({ key, error: "这份内容已移除或类型不匹配，无法预览。" });
        else setResult({ key, detail: data });
      })
      .catch((reason) => {
        if (!controller.signal.aborted)
          setResult({ key, error: draftError(reason) });
      });
    return () => controller.abort();
  }, [baseUrl, csrfToken, type, id, key]);
  return {
    baseUrl,
    detail: result?.key === key ? result.detail : undefined,
    error: result?.key === key ? (result.error ?? "") : "",
    retry: () => setAttempt((value) => value + 1),
  };
}
