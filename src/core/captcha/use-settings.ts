"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readCaptchaSettings,
  saveCaptchaSettings,
  type CaptchaSettingsState,
  type SaveCaptchaSettings,
} from "@/core/contracts/captcha";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";

function draftFromState(state: CaptchaSettingsState): SaveCaptchaSettings {
  return {
    expected_revision: state.revision,
    provider: state.provider,
    rules: state.rules,
    api_key_bypass: state.api_key_bypass,
    api_key_rate_limit: state.api_key_rate_limit,
    providers: Object.fromEntries(
      Object.entries(state.providers).map(([id, value]) => [
        id,
        { site_key: value.site_key, hostnames: value.hostnames },
      ]),
    ),
  };
}
export function useCaptchaSettings() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [saved, setSaved] = useState<CaptchaSettingsState | null>(null);
  const [draft, setDraft] = useState<SaveCaptchaSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const active = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await readCaptchaSettings(baseUrl, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSaved(response.data);
        setDraft(draftFromState(response.data));
      }
    } catch {
      if (!controller.signal.aborted) setError("无法读取验证码设置，请重试。");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [baseUrl]);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void reload();
    });
    return () => {
      disposed = true;
      active.current?.abort();
    };
  }, [reload]);
  const reset = () => {
    if (saved) setDraft(draftFromState(saved));
    setError("");
    setMessage("");
  };
  const save = async () => {
    if (!draft || busy) return;
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await saveCaptchaSettings(baseUrl, draft, csrfToken, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSaved(result.data);
        setDraft(draftFromState(result.data));
        setMessage("验证码设置已保存。阅读规则将在节点同步后更新。");
      }
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof RequestError && reason.status === 409
            ? "设置已在其他地方修改。当前输入已保留，请重新读取后合并。"
            : reason instanceof RequestError && reason.status === 422
              ? "请检查验证码配置和请求频率。当前输入已保留。"
              : "保存结果尚未确认，当前输入已保留，请重新检查服务器设置。",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  return {
    saved,
    draft,
    setDraft,
    busy,
    loading,
    error,
    message,
    reload,
    reset,
    save,
    dirty: Boolean(
      saved &&
      draft &&
      JSON.stringify(draft) !== JSON.stringify(draftFromState(saved)),
    ),
  };
}
