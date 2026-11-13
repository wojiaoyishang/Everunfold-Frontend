"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import type {
  PluginUsage,
  PublicSettings,
  SaveSettings,
  SettingsState,
} from "@/core/contracts/settings";
import {
  queryExtensionUsage,
  readSettings,
  saveSettings,
} from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
import { AdminSiteBrandUpdate } from "@/core/admin/site-brand";
import { RequestError } from "@/core/http/request";
import {
  changedPluginIds,
  pluginNeedsConfirmation,
  restorePluginChoices,
} from "./plugin-impact";
import { mergeActivatedTheme, themeActivationInput } from "./theme-activation";

export function settingsFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 42236) return "首页和文章列表页须选择不同的已公开页面。";
    if (error.code === 42237) return "请选择仍可使用的文章分类。";
    if (error.code === 42298)
      return "选中的主题或插件尚未在所有启用节点完成部署登记。当前修改已保留，请刷新部署清单。";
    if (error.code === 42292)
      return "该语言仍有文章或说说，请保留语言或改为禁用。";
    if (error.code === 42294)
      return "语言前缀与已有公开地址冲突，请更换前缀或先调整内容地址。";
    if (error.status === 409)
      return "服务器上的设置已更新。你的修改已保留，请载入服务器版本后重新合并。";
    if (error.status === 401 || error.status === 403)
      return "登录状态或权限已变化，请重新登录后再保存。";
    if (error.status === 422)
      return "请检查选项的长度、链接格式和有效范围。当前修改已保留。";
  }
  return "暂时无法确认保存结果。你的修改已保留，请先检查服务器版本。";
}
function useEditor() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const updateBrand = useContext(AdminSiteBrandUpdate);
  const [saved, setSaved] = useState<SettingsState | null>(null);
  const [draft, setDraft] = useState<PublicSettings | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [checkingPlugins, setCheckingPlugins] = useState(false);
  const [pluginImpact, setPluginImpact] = useState<{
    input: SaveSettings;
    plugins: PluginUsage[];
    previous: PublicSettings;
    changedIds: string[];
  } | null>(null);
  const inFlight = useRef(false);
  const pluginChangeTrigger = useRef<HTMLElement | null>(null);
  const [loading, setLoading] = useState(true);
  const operation = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const acceptSettings = useCallback(
    (state: SettingsState) => {
      const { name, icon_url } = state.value.site;
      setSaved(state);
      updateBrand?.({ name, icon_url, revision: state.revision });
      window.dispatchEvent(new Event("everunfold-language-catalog"));
    },
    [updateBrand],
  );
  const reload = useCallback(async () => {
    const id = ++operation.current;
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await readSettings(baseUrl);
      if (mounted.current && operation.current === id) {
        acceptSettings(response.data);
        setDraft(response.data.value);
      }
    } catch {
      if (mounted.current && operation.current === id)
        setError("暂时无法读取设置，请检查后端连接后重试。");
    } finally {
      if (mounted.current && operation.current === id) setLoading(false);
    }
  }, [acceptSettings, baseUrl]);
  useEffect(() => {
    let disposed = false;
    // Match the session boundary: discard Strict Mode's first setup before requesting.
    queueMicrotask(() => {
      if (!disposed) void reload();
    });
    return () => {
      disposed = true;
    };
  }, [reload]);
  const dirty = Boolean(
    saved && draft && JSON.stringify(saved.value) !== JSON.stringify(draft),
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  const refreshDelivery = useCallback(async () => {
    try {
      const response = await readSettings(baseUrl);
      if (!mounted.current) return;
      setSaved((current) =>
        current?.revision === response.data.revision
          ? { ...current, delivery: response.data.delivery }
          : current,
      );
    } catch {
      /* A failed status check never discards a draft or starts a save. */
    }
  }, [baseUrl]);
  const waiting =
    saved?.delivery.some(
      (node) => node.status === "pending" || node.status === "failed",
    ) ?? false;
  useEffect(() => {
    if (!waiting) return;
    let count = 0;
    const timer = setInterval(() => {
      if (++count > 30) clearInterval(timer);
      else void refreshDelivery();
    }, 2000);
    return () => clearInterval(timer);
  }, [waiting, saved?.revision, refreshDelivery]);
  async function persist(input: SaveSettings) {
    try {
      const response = await saveSettings(baseUrl, input, csrfToken);
      if (!mounted.current) return false;
      acceptSettings(response.data);
      setDraft(response.data.value);
      setMessage("设置已保存。节点应用后，下一次页面访问将使用最新配置。");
      return true;
    } catch (error) {
      if (mounted.current) setError(settingsFailure(error));
      return false;
    }
  }
  async function activateTheme(theme: string) {
    if (!saved || !draft || inFlight.current || pluginImpact) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await saveSettings(
        baseUrl,
        themeActivationInput(saved, theme),
        csrfToken,
      );
      if (!mounted.current) return false;
      acceptSettings(response.data);
      setDraft((current) =>
        current ? mergeActivatedTheme(current, response.data.value) : current,
      );
      setMessage("主题已启用，节点同步后生效。其他未保存的设置仍保留。");
      return true;
    } catch (error) {
      if (mounted.current) setError(settingsFailure(error));
      return false;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function changePlugins(pluginIds: readonly string[], enabled: boolean) {
    pluginChangeTrigger.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setDraft((value) => {
      if (!value) return value;
      const current = value.extensions?.disabled_plugins ?? [];
      return {
        ...value,
        extensions: {
          ...value.extensions,
          disabled_plugins: enabled
            ? current.filter((id) => !pluginIds.includes(id))
            : [...new Set([...current, ...pluginIds])].sort(),
        },
      };
    });
  }
  async function save() {
    if (!saved || !draft || inFlight.current || pluginImpact) return;
    if (!pluginChangeTrigger.current?.isConnected)
      pluginChangeTrigger.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
    inFlight.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    const input: SaveSettings = {
      expected_revision: saved.revision,
      value: structuredClone(draft),
    };
    try {
      const ids = changedPluginIds(saved.value, input.value);
      if (ids.length) {
        setCheckingPlugins(true);
        const plugins: PluginUsage[] = [];
        for (let offset = 0; offset < ids.length; offset += 100) {
          const report = await queryExtensionUsage(
            baseUrl,
            { plugin_ids: ids.slice(offset, offset + 100) },
            csrfToken,
          );
          plugins.push(...report.data.plugins.filter(pluginNeedsConfirmation));
        }
        if (!mounted.current) return;
        setCheckingPlugins(false);
        if (plugins.length) {
          setPluginImpact({
            input,
            plugins,
            previous: saved.value,
            changedIds: ids,
          });
          return;
        }
      }
      await persist(input);
    } catch (error) {
      if (mounted.current)
        setError(
          error instanceof RequestError &&
            (error.status === 401 || error.status === 403)
            ? settingsFailure(error)
            : "无法检查插件使用情况，设置尚未保存。请稍后重试。",
        );
    } finally {
      inFlight.current = false;
      if (mounted.current) {
        setCheckingPlugins(false);
        setBusy(false);
      }
    }
  }
  async function confirmPluginChange() {
    if (!pluginImpact || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setError("");
    try {
      return await persist(pluginImpact.input);
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  function cancelPluginChange() {
    if (!pluginImpact || inFlight.current) return;
    setDraft((current) =>
      current
        ? restorePluginChoices(
            current,
            pluginImpact.previous,
            pluginImpact.changedIds,
          )
        : current,
    );
    setPluginImpact(null);
  }
  return {
    saved,
    draft,
    setDraft,
    error,
    message,
    busy,
    checkingPlugins,
    pluginImpact,
    pluginChangeTrigger,
    confirmPluginChange,
    cancelPluginChange,
    dismissPluginImpact: () => setPluginImpact(null),
    loading,
    dirty,
    save,
    changePlugins,
    activateTheme,
    reload,
    refreshDelivery,
    reset: () => {
      if (saved) setDraft(saved.value);
      setError("");
      setMessage("");
    },
  };
}
type Editor = ReturnType<typeof useEditor>;
const Context = createContext<Editor | null>(null);
/** Retain unsaved edits while moving between the registered site/theme settings pages. */
export function SettingsEditorProvider({ children }: { children: ReactNode }) {
  return <Context value={useEditor()}>{children}</Context>;
}
export function useSettingsEditor() {
  const editor = useContext(Context);
  if (!editor) throw new Error("Settings editor boundary missing");
  return editor;
}
