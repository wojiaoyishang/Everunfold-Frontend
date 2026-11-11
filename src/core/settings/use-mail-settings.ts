"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readMailSettings,
  saveMailSettings,
  type MailSettingsState,
  type SaveMailSettings,
} from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
const draftFrom = (state: MailSettingsState): SaveMailSettings => ({
  expected_revision: state.revision,
  profiles: state.profiles.map((profile) => ({
    id: profile.id,
    name: profile.name,
    enabled: profile.enabled,
    is_default: profile.is_default,
    value: profile.value,
    password: "",
    clear_password: false,
  })),
});
export function useMailSettings() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [saved, setSaved] = useState<MailSettingsState | null>(null);
  const [draft, setDraft] = useState<SaveMailSettings | null>(null);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const active = useRef<AbortController | null>(null);
  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await readMailSettings(baseUrl, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSaved(response.data);
        setDraft(draftFrom(response.data));
      }
    } catch {
      if (!controller.signal.aborted) setError("无法读取邮件配置，请重试。");
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
  const save = async () => {
    if (!draft || busy) return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await saveMailSettings(baseUrl, draft, csrfToken, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setSaved(response.data);
        setDraft(draftFrom(response.data));
        setMessage("邮件发信配置已保存，本次操作未发送邮件。");
      }
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof RequestError && reason.status === 409
            ? "配置已在其他地方修改，当前输入已保留。请核对后重新读取。"
            : reason instanceof RequestError && reason.status === 422
              ? "请检查默认配置、服务器、邮箱格式及认证信息；启用时须填写完整配置。"
              : "保存结果尚未确认，当前输入已保留。",
        );
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  };
  const reset = () => {
    if (saved) setDraft(draftFrom(saved));
    setError("");
    setMessage("");
  };
  return {
    saved,
    draft,
    setDraft,
    loading,
    busy,
    error,
    message,
    reload,
    save,
    reset,
    dirty: !!(
      saved &&
      draft &&
      JSON.stringify(draft) !== JSON.stringify(draftFrom(saved))
    ),
  };
}
