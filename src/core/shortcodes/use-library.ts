"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readSettings,
  readShortcodes,
  previewShortcode,
} from "@/generated/settings-client";
import type {
  PublicShortcode,
  SettingsState,
  ShortcodeSource,
} from "@/generated/settings-contract";
import { RequestError } from "@/core/http/request";
import { frontendShortcodes, type CatalogItem } from "./registry";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";

export function shortcodeFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.status === 409 && error.code === 40981)
      return "调用名称已被使用，请更换调用名称。你的修改已保留。";
    if (error.status === 409)
      return "服务器版本已更新。你的修改已保留，请重新读取后合并。";
    if (error.status === 403 || error.status === 401)
      return "登录状态或编辑权限已变化，请重新登录。";
    if (error.status === 422)
      return "模板未通过校验，请检查名称、参数和预览中的提示。";
  }
  return "暂时无法确认操作结果。修改已保留，请先重新读取服务器版本。";
}

export function useShortcodeLibrary() {
  const { baseUrl } = useAdminRequest();
  const canReadSettings = can(useAdminAccount(), "settings:read");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [settings, setSettings] = useState<SettingsState | null>(null);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const request = useRef(0),
    mounted = useRef(true);
  const reload = useCallback(async () => {
    const id = ++request.current;
    setLoading(true);
    setError("");
    try {
      const [catalog, state] = await Promise.all([
        readShortcodes(baseUrl),
        canReadSettings ? readSettings(baseUrl) : Promise.resolve(null),
      ]);
      if (mounted.current && request.current === id) {
        setItems([...catalog.data.items, ...frontendShortcodes]);
        setSettings(state?.data ?? null);
      }
    } catch (error) {
      if (mounted.current && request.current === id)
        setError(shortcodeFailure(error));
    } finally {
      if (mounted.current && request.current === id) setLoading(false);
    }
  }, [baseUrl, canReadSettings]);
  useEffect(() => {
    let active = true;
    mounted.current = true;
    queueMicrotask(() => {
      if (active) void reload();
    });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [reload]);
  const pending = settings?.delivery.some(
    (node) => node.status === "pending" || node.status === "failed",
  );
  useEffect(() => {
    if (!pending) return;
    let attempts = 0,
      active = true;
    const timer = setInterval(() => {
      if (++attempts > 30) {
        clearInterval(timer);
        return;
      }
      void readSettings(baseUrl)
        .then((result) => {
          if (active) setSettings(result.data);
        })
        .catch(() => {});
    }, 2000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [baseUrl, pending, settings?.revision]);
  return { items, settings, loading, error, reload };
}

export function useShortcodeCompilation(
  source: ShortcodeSource,
  id: string | undefined,
  enabled: boolean,
) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const key = JSON.stringify(source);
  const [result, setResult] = useState<{
    key: string;
    compiled: PublicShortcode | null;
    error: string;
  }>();
  const valid = Boolean(
    source.title.trim() &&
    /^[a-z][a-z0-9-]{0,47}(?::[a-z][a-z0-9-]{0,47})?$/.test(source.name) &&
    source.html.trim(),
  );
  useEffect(() => {
    if (!enabled || !valid) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void previewShortcode(
        baseUrl,
        { id, value: JSON.parse(key) as ShortcodeSource },
        csrfToken,
        { signal: controller.signal },
      )
        .then(({ data }) => {
          if (!controller.signal.aborted) setResult({ key, ...data });
        })
        .catch((error) => {
          if (!controller.signal.aborted)
            setResult({ key, compiled: null, error: shortcodeFailure(error) });
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [baseUrl, csrfToken, key, id, enabled, valid]);
  return {
    compiled: result?.key === key ? result.compiled : null,
    error: !valid
      ? "填写名称、标题和 HTML 后即可预览。"
      : result?.key === key
        ? result.error
        : "",
    pending: enabled && valid && result?.key !== key,
  };
}

export function useAppliedShortcodes() {
  const { baseUrl } = useAdminRequest();
  const [definitions, setDefinitions] = useState<PublicShortcode[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    void readSettings(baseUrl, { signal: controller.signal })
      .then(({ data }) => setDefinitions(data.value.shortcodes ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [baseUrl]);
  return definitions;
}
