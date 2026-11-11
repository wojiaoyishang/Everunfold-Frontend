"use client";

import { useCallback, useEffect, useState } from "react";
import {
  readTranslations,
  saveTranslations,
  type SaveTranslations,
  type TranslationChange,
  type TranslationState,
} from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";

export function useTranslationSettings() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [saved, setSaved] = useState<TranslationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      setLoading(true);
      setError("");
      try {
        const response = await readTranslations(baseUrl, { signal });
        if (!signal?.aborted) setSaved(response.data);
      } catch {
        if (!signal?.aborted) setError("无法读取翻译设置，请重试。");
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [baseUrl],
  );

  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void reload(controller.signal);
    });
    return () => controller.abort();
  }, [reload]);

  const save = async (changes: TranslationChange[]) => {
    if (!saved || !changes.length || busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    let current = saved;
    try {
      for (let offset = 0; offset < changes.length; offset += 500) {
        const payload: SaveTranslations = {
          expected_revision: current.revision,
          changes: changes.slice(offset, offset + 500),
        };
        const response = await saveTranslations(baseUrl, payload, csrfToken);
        current = response.data;
        setSaved(current);
      }
      setMessage("翻译设置已保存，正在等待前端节点应用。");
      return true;
    } catch (reason) {
      setSaved(current);
      setError(
        reason instanceof RequestError && reason.status === 409
          ? "翻译已在其他窗口修改。当前输入已保留，请重新读取后合并。"
          : "保存结果尚未确认，当前输入已保留。",
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  return { saved, loading, busy, error, message, reload, save };
}
