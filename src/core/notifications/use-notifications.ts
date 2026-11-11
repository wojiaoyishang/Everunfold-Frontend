"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  markNotificationsRead,
  readNotificationInbox,
  readNotificationState,
  saveNotificationRoutes,
  saveNotificationTemplate,
  type NotificationInbox,
  type NotificationRouteInput,
  type NotificationState,
  type SaveNotificationTemplate,
} from "@/core/contracts/notifications";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";

function failureMessage(reason: unknown, conflict: string, invalid: string) {
  if (reason instanceof RequestError && reason.status === 409) return conflict;
  if (reason instanceof RequestError && reason.status === 422) return invalid;
  if (reason instanceof RequestError && reason.status === 403)
    return "当前账号没有修改此设置的权限。";
  return "请求结果尚未确认，请重试。";
}

export function useNotificationState() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const active = useRef<AbortController | null>(null);
  const [state, setState] = useState<NotificationState | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const reload = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await readNotificationState(baseUrl, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) setState(response.data);
    } catch (reason) {
      if (!controller.signal.aborted)
        setError(
          reason instanceof RequestError && reason.status === 403
            ? "当前账号没有读取通知设置的权限。"
            : "无法读取通知设置，请检查后端服务后重试。",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => void reload(), 0);
    return () => {
      window.clearTimeout(timer);
      active.current?.abort();
    };
  }, [reload]);

  const saveRoutes = async (routes: NotificationRouteInput[]) => {
    if (!state || busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await saveNotificationRoutes(
        baseUrl,
        { expected_revision: state.revision, routes },
        csrfToken,
      );
      setState(response.data);
      setMessage("通知策略已保存。");
      return true;
    } catch (reason) {
      setError(
        failureMessage(
          reason,
          "通知策略已在其他窗口修改。当前编辑仍保留，请重新读取后再合并。",
          "请检查事件、接收人和平台选择。",
        ),
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  const saveTemplate = async (input: SaveNotificationTemplate) => {
    if (!state || busy) return false;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await saveNotificationTemplate(
        baseUrl,
        { ...input, expected_revision: state.revision },
        csrfToken,
      );
      setState(response.data);
      setMessage(input.reset ? "模板已恢复内置默认值。" : "通知模板已保存。");
      return true;
    } catch (reason) {
      setError(
        failureMessage(
          reason,
          "通知模板已在其他窗口修改。当前输入仍保留，请重新读取后再合并。",
          "请检查模板主题、正文和语言。",
        ),
      );
      return false;
    } finally {
      setBusy(false);
    }
  };

  return {
    state,
    loading,
    busy,
    error,
    message,
    reload,
    saveRoutes,
    saveTemplate,
    clearMessage: () => {
      setError("");
      setMessage("");
    },
  };
}

export function useNotificationInbox() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const active = useRef<AbortController | null>(null);
  const [inbox, setInbox] = useState<NotificationInbox | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    if (document.visibilityState === "hidden") return;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    try {
      const response = await readNotificationInbox(baseUrl, {
        signal: controller.signal,
      });
      if (!controller.signal.aborted) {
        setInbox(response.data);
        setError(false);
      }
    } catch {
      if (!controller.signal.aborted) setError(true);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    const delay = window.setTimeout(() => void refresh(), 350);
    const interval = window.setInterval(() => void refresh(), 45_000);
    const focus = () => void refresh();
    window.addEventListener("focus", focus);
    return () => {
      window.clearTimeout(delay);
      window.clearInterval(interval);
      window.removeEventListener("focus", focus);
      active.current?.abort();
    };
  }, [refresh]);

  const markRead = async (ids: string[] = []) => {
    if (loading) return;
    setLoading(true);
    try {
      const response = await markNotificationsRead(baseUrl, { ids }, csrfToken);
      setInbox(response.data);
      setError(false);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  return {
    inbox,
    unread: inbox?.unread ?? 0,
    loading,
    error,
    refresh,
    markRead,
  };
}
