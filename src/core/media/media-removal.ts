"use client";
import { randomUUID } from "@/core/browser/crypto";
import { useCallback, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
import {
  previewMediaRemoval,
  removeMedia,
  restoreMedia,
} from "@/generated/settings-client";
import type {
  MediaDetails,
  MediaRemovalPreview,
} from "@/generated/settings-contract";

function removalError(failure: unknown) {
  const code = failure instanceof RequestError ? failure.code : undefined;
  if (code === 40936) return "这组文件仍在使用，请先移除站点或内容中的引用。";
  if (code === 40937)
    return "历史设置或编辑副本仍引用原件，可以放入回收站，但暂不能永久删除。";
  if (code === 40938 || code === 41030)
    return "这条记录已经永久删除，请重新读取附件列表。";
  if (code === 40931) return "文件资料已变更，请关闭详情后重新打开。";
  if (code === 40939) return "删除范围已变化，请重新读取并确认。";
  if (code === 50331) return "原文件暂未全部删除，请重试；这组文件已停止公开。";
  return "尚未确认操作结果，请重试。";
}

export function useMediaRemoval(detail: MediaDetails) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<MediaRemovalPreview | null>(null);
  const pending = useRef<{ token: string; operationId: string } | null>(null);
  const prepare = useCallback(
    async (original: boolean, safe: boolean, signal: AbortSignal) => {
      setChecking(true);
      setError("");
      setPlan(null);
      try {
        const result = await previewMediaRemoval(
          baseUrl,
          {
            id: detail.id,
            expected_revision: detail.revision,
            delete_original: original,
            safe_delete: safe,
          },
          csrfToken,
          { signal },
        );
        if (!signal.aborted) setPlan(result.data);
      } catch (failure) {
        if (!signal.aborted) setError(removalError(failure));
      } finally {
        if (!signal.aborted) setChecking(false);
      }
    },
    [baseUrl, csrfToken, detail.id, detail.revision],
  );

  const run = async (action: "remove" | "restore") => {
    if (busy || (action === "remove" && (!plan || checking))) return false;
    setBusy(true);
    setError("");
    try {
      if (action === "restore")
        await restoreMedia(baseUrl, { id: detail.id }, csrfToken);
      else if (plan) {
        if (pending.current?.token !== plan.token)
          pending.current = {
            token: plan.token,
            operationId: plan.resume_operation_id ?? randomUUID(),
          };
        await removeMedia(
          baseUrl,
          {
            id: plan.id,
            expected_revision: detail.revision,
            delete_original: plan.delete_original,
            safe_delete: plan.safe_delete,
            operation_id: pending.current.operationId,
            expected_plan: plan.token,
          },
          csrfToken,
        );
      }
      return true;
    } catch (failure) {
      setError(removalError(failure));
      if (failure instanceof RequestError && failure.code === 40939)
        setPlan(null);
      return false;
    } finally {
      setBusy(false);
    }
  };
  return { busy, checking, error, plan, prepare, run };
}
