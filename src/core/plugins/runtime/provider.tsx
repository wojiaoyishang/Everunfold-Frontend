"use client";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as jsx from "react/jsx-runtime";
import * as jsxDev from "react/jsx-dev-runtime";
import * as client from "@/sdk/client";
import { SDK_RUNTIME_KEY, SDK_CLIENT_EXPORTS } from "@/sdk/protocol";
import type { FrontendPlugin } from "../types";
import type {
  RegisteredPluginAdminPage,
  RegisteredPluginAdminMenuGroup,
} from "../admin-page-types";
import { createPluginRegistry } from "../create-registry";
import { compareAdminFormFieldHooks } from "@/core/forms/admin-field-hooks";
import { installRuntimePlugins } from "./store";
import {
  AdminPluginRuntimeContext,
  RuntimeContext,
  type RuntimeComponents,
} from "./context";
import type { PublicPluginPackage, RuntimeCatalog } from "./types";
import { RuntimeComponent } from "./view";
import { isPluginEditingRoute, packageSetChanged } from "./update-policy";
import styles from "./runtime.module.css";
import { RegisteredFontsProvider } from "@/core/fonts/provider";

const assetURL = (plugin: PublicPluginPackage, file: string) =>
  `/__plugins/${plugin.surface === "admin" ? "admin/" : ""}assets/${encodeURIComponent(plugin.directory)}/${encodeURIComponent(file)}`;
interface Loaded {
  build: string;
  components: Record<string, React.ComponentType<Record<string, unknown>>>;
  plugin: FrontendPlugin;
  fieldHooks: ReturnType<typeof createPluginRegistry>["adminFormFieldHooks"];
  adminPages: readonly RegisteredPluginAdminPage[];
  adminMenuGroups: readonly RegisteredPluginAdminMenuGroup[];
  dispose: () => void;
  css?: string;
}
interface RefreshRuntime {
  injectIntoGlobalHook(global: typeof globalThis): void;
  register(type: unknown, id: string): void;
  createSignatureFunctionForTransform: () => unknown;
  performReactRefresh(): unknown;
}
let refresh: RefreshRuntime | undefined;
async function prepareSDK(development: boolean) {
  if (process.env.NODE_ENV !== "production" && development && !refresh) {
    refresh =
      (await import("next/dist/compiled/react-refresh/runtime")) as unknown as RefreshRuntime;
    refresh.injectIntoGlobalHook(globalThis);
  }
  for (const name of SDK_CLIENT_EXPORTS)
    if (!(name in client)) throw new Error(`Missing SDK export: ${name}`);
  Object.defineProperty(globalThis, Symbol.for(SDK_RUNTIME_KEY), {
    configurable: true,
    value: { react: React, reactDOM: ReactDOM, jsx, jsxDev, client, refresh },
  });
}
async function stylesheet(plugin: PublicPluginPackage, signal: AbortSignal) {
  if (!plugin.entries.css) return;
  const url = assetURL(plugin, plugin.entries.css);
  if (
    Array.from(document.querySelectorAll("link[data-plugin-css]")).some(
      (link) => link.getAttribute("href") === url,
    )
  )
    return;
  await new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = url;
    link.dataset.pluginCss = plugin.id;
    link.dataset.pluginSurface = plugin.surface ?? "public";
    function abort() {
      link.remove();
      reject(signal.reason);
    }
    signal.addEventListener("abort", abort, { once: true });
    link.onload = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    link.onerror = () => {
      signal.removeEventListener("abort", abort);
      link.remove();
      reject(new Error("插件样式加载失败"));
    };
    document.head.append(link);
  });
}

function usePackageRuntime(initial: RuntimeCatalog | null, surface?: "admin") {
  const [value, setValue] = React.useState<{
    catalog: RuntimeCatalog | null;
    components: RuntimeComponents;
    loading: boolean;
    fieldHooks: ReturnType<typeof createPluginRegistry>["adminFormFieldHooks"];
    adminPages: readonly RegisteredPluginAdminPage[];
    adminMenuGroups: readonly RegisteredPluginAdminMenuGroup[];
  }>({
    catalog: initial,
    components: new Map(),
    loading: true,
    fieldHooks: [],
    adminPages: [],
    adminMenuGroups: [],
  });
  const initialRef = React.useRef(initial);
  const [updatePending, setUpdatePending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dismissed, setDismissed] = React.useState("");
  React.useEffect(() => {
    const initial = initialRef.current;
    const styleNodes = () =>
      document.querySelectorAll<HTMLLinkElement>(
        `link[data-plugin-surface="${surface ?? "public"}"]`,
      );
    let stopped = false;
    const controller = new AbortController(),
      loaded = new Map<string, Loaded>();
    let accepted = "";
    const apply = async (catalog: RuntimeCatalog) => {
      if (catalog.revision === accepted) return;
      if (
        !surface &&
        accepted &&
        !catalog.development &&
        isPluginEditingRoute(location.pathname) &&
        packageSetChanged(loaded, catalog)
      ) {
        setUpdatePending(true);
        return;
      }
      await prepareSDK(catalog.development);
      const next = new Map<string, Loaded>();
      try {
        for (const plugin of catalog.plugins) {
          if (
            catalog.disabled.includes(plugin.id) ||
            plugin.surface !== surface
          )
            continue;
          const previous = loaded.get(plugin.id);
          if (previous?.build === plugin.build) {
            next.set(plugin.id, previous);
            continue;
          }
          try {
            next.set(plugin.id, await load(plugin));
          } catch (error) {
            if (!surface || controller.signal.aborted) throw error;
            // Each optional admin package can fail independently of sibling actions.
            if (previous) next.set(plugin.id, previous);
            for (const link of styleNodes()) {
              if (
                link.dataset.pluginCss === plugin.id &&
                previous?.css !== link.getAttribute("href")
              )
                link.remove();
            }
          }
        }
      } catch (error) {
        for (const [id, item] of next)
          if (loaded.get(id) !== item) item.dispose();
        for (const link of styleNodes()) {
          if (
            ![...loaded.values()].some(
              (item) => item.css === link.getAttribute("href"),
            )
          )
            link.remove();
        }
        throw error;
      }

      async function load(plugin: PublicPluginPackage): Promise<Loaded> {
        const shared = await import(
          /* webpackIgnore: true */ /* turbopackIgnore: true */ assetURL(
            plugin,
            plugin.entries.shared,
          )
        );
        controller.signal.throwIfAborted();
        const declaration: FrontendPlugin = shared.default;
        if (declaration.id !== plugin.id || declaration.surface !== surface)
          throw new Error(
            "Plugin browser declaration does not match its manifest",
          );
        const registry = surface ? createPluginRegistry([declaration]) : null;
        await stylesheet(plugin, controller.signal);
        const entryModule = plugin.entries.browser
          ? await import(
              /* webpackIgnore: true */ /* turbopackIgnore: true */ assetURL(
                plugin,
                plugin.entries.browser,
              )
            )
          : { default: {} };
        controller.signal.throwIfAborted();
        const components: Loaded["components"] = entryModule.default ?? {};
        const callbacks: (() => void)[] = [];
        const dispose = () =>
          callbacks.forEach((callback) => {
            try {
              callback();
            } catch {
              /* A failed plugin cleanup cannot interrupt unloading other plugins. */
            }
          });
        if (typeof entryModule.activate === "function")
          try {
            entryModule.activate({
              components: {
                register(
                  name: string,
                  component: Loaded["components"][string],
                ) {
                  if (!plugin.components.includes(name))
                    throw new Error("插件组件未在清单中声明");
                  components[name] = component;
                },
              },
              onDispose(callback: () => void) {
                callbacks.push(callback);
              },
            });
          } catch (error) {
            dispose();
            throw error;
          }
        return {
          build: plugin.build,
          css: plugin.entries.css
            ? assetURL(plugin, plugin.entries.css)
            : undefined,
          components,
          plugin: declaration,
          fieldHooks: registry?.adminFormFieldHooks ?? [],
          adminPages: registry?.adminPages ?? [],
          adminMenuGroups: registry?.adminMenuGroups ?? [],
          dispose,
        };
      }
      if (stopped) {
        for (const [id, item] of next)
          if (loaded.get(id) !== item) item.dispose();
        return;
      }
      const declarations = [...next.values()].map((item) => item.plugin);
      const fieldHooks = [...next.values()]
        .flatMap((item) => item.fieldHooks)
        .sort(compareAdminFormFieldHooks);
      if (!surface)
        installRuntimePlugins(declarations, catalog.disabled, catalog.revision);
      refresh?.performReactRefresh();
      for (const [id, item] of loaded)
        if (next.get(id) !== item) item.dispose();
      loaded.clear();
      for (const [id, item] of next) loaded.set(id, item);
      const components = new Map(
        [...next].map(([id, item]) => [id, item.components]),
      );
      setValue({
        catalog,
        components,
        loading: false,
        fieldHooks,
        adminPages: [...next.values()].flatMap((item) =>
          item.adminPages.filter((page) => item.components[page.component]),
        ),
        adminMenuGroups: [...next.values()].flatMap(
          (item) => item.adminMenuGroups,
        ),
      });
      setUpdatePending(false);
      for (const link of styleNodes()) {
        const css = loaded.get(link.dataset.pluginCss ?? "")?.css;
        if (!css || link.getAttribute("href") !== css) link.remove();
      }
      const complete = catalog.plugins.every(
        (plugin) =>
          catalog.disabled.includes(plugin.id) ||
          loaded.get(plugin.id)?.build === plugin.build,
      );
      // Invalidate acceptance while retrying a partial admin update.
      if (complete) accepted = catalog.revision;
      else accepted = "";
      setError(complete ? "" : "部分后台扩展加载失败，当前表单可以继续使用。");
    };
    const poll = async (first = false) => {
      try {
        const catalog: RuntimeCatalog | null =
          first && initial
            ? initial
            : await fetch(
                surface ? "/__plugins/admin/catalog" : "/__plugins/catalog",
                {
                  cache: "no-store",
                  credentials: "omit",
                  signal: controller.signal,
                },
              ).then(async (response) => {
                if (!response.ok) throw new Error("插件目录暂不可用");
                return response.json();
              });
        if (catalog) await apply(catalog);
      } catch {
        if (!stopped) {
          setError("插件更新暂未完成，当前内容已保留。");
          setValue((current) => ({ ...current, loading: false }));
        }
      }
    };
    let timer: ReturnType<typeof setTimeout>;
    const development =
      initial?.development ?? process.env.NODE_ENV !== "production";
    const pollDelay = development ? 15_000 : 60_000;
    const cycle = async () => {
      if (development || document.visibilityState !== "hidden") await poll();
      if (!stopped) timer = setTimeout(cycle, pollDelay);
    };
    void poll(true).then(() => {
      if (!stopped) timer = setTimeout(cycle, pollDelay);
    });
    return () => {
      stopped = true;
      controller.abort();
      clearTimeout(timer);
      for (const item of loaded.values()) item.dispose();
      if (surface) for (const link of styleNodes()) link.remove();
    };
  }, [surface]);
  const diagnostics = value.catalog?.development
    ? [
        ...value.catalog.errors.map(
          (item) => `${item.directory}：${item.message}`,
        ),
        ...(error ? [error] : []),
      ].join("\n")
    : "";
  return {
    value,
    updatePending,
    diagnostics: diagnostics === dismissed ? "" : diagnostics,
    setDismissed,
  };
}

export function PluginRuntimeProvider({
  initial,
  children,
}: {
  initial: RuntimeCatalog;
  children: React.ReactNode;
}) {
  const { value, updatePending, diagnostics, setDismissed } =
    usePackageRuntime(initial);
  const fonts = React.useMemo(
    () =>
      value.catalog?.plugins
        .filter((plugin) => !value.catalog?.disabled.includes(plugin.id))
        .flatMap((plugin) => plugin.fonts ?? []) ?? [],
    [value.catalog],
  );
  return (
    <RuntimeContext.Provider value={value}>
      <RegisteredFontsProvider fonts={fonts}>
        {children}
      </RegisteredFontsProvider>
      {updatePending && (
        <aside className={styles.error} role="status">
          <client.UiText text="扩展已更新，重新打开编辑器后应用。当前编辑内容已保留。" />
        </aside>
      )}
      <PluginRuntimeDiagnostics
        message={diagnostics}
        onDismiss={setDismissed}
      />
    </RuntimeContext.Provider>
  );
}

export function AdminPluginRuntimeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { value, diagnostics, setDismissed } = usePackageRuntime(null, "admin");
  return (
    <AdminPluginRuntimeContext.Provider value={value}>
      {children}
      <PluginRuntimeDiagnostics
        message={diagnostics}
        onDismiss={setDismissed}
      />
    </AdminPluginRuntimeContext.Provider>
  );
}

function PluginRuntimeDiagnostics({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: (message: string) => void;
}) {
  return (
    message && (
      <aside className={styles.error} role="alert">
        <strong>
          <client.UiText text="插件开发状态" />
        </strong>
        <pre>{message}</pre>
        <client.Button onClick={() => onDismiss(message)}>
          关闭提示
        </client.Button>
      </aside>
    )
  );
}

// Exported from one stable module so runtime-owned implementations do not recreate the wrapper.
export { RuntimeComponent };
