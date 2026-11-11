"use client";
import * as React from "react";
import * as ReactDOM from "react-dom";
import * as jsx from "react/jsx-runtime";
import * as jsxDev from "react/jsx-dev-runtime";
import * as client from "@/sdk/client";
import { SDK_RUNTIME_KEY, SDK_CLIENT_EXPORTS } from "@/sdk/protocol";
import type { FrontendPlugin } from "../types";
import { installRuntimePlugins } from "./store";
import { RuntimeContext, type RuntimeComponents } from "./context";
import type { PublicPluginPackage, RuntimeCatalog } from "./types";
import { RuntimeComponent } from "./view";
import { isPluginEditingRoute, packageSetChanged } from "./update-policy";
import styles from "./runtime.module.css";
import { RegisteredFontsProvider } from "@/core/fonts/provider";

const assetURL = (plugin: PublicPluginPackage, file: string) =>
  `/__plugins/assets/${encodeURIComponent(plugin.directory)}/${encodeURIComponent(file)}`;
interface Loaded {
  build: string;
  components: Record<string, React.ComponentType<Record<string, unknown>>>;
  plugin: FrontendPlugin;
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
async function stylesheet(plugin: PublicPluginPackage) {
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
    link.onload = () => resolve();
    link.onerror = () => {
      link.remove();
      reject(new Error("插件样式加载失败"));
    };
    document.head.append(link);
  });
}

export function PluginRuntimeProvider({
  initial,
  children,
}: {
  initial: RuntimeCatalog;
  children: React.ReactNode;
}) {
  const [value, setValue] = React.useState<{
    catalog: RuntimeCatalog;
    components: RuntimeComponents;
    loading: boolean;
  }>({ catalog: initial, components: new Map(), loading: true });
  const initialRef = React.useRef(initial);
  const [updatePending, setUpdatePending] = React.useState(false);
  const [error, setError] = React.useState("");
  const [dismissed, setDismissed] = React.useState("");
  React.useEffect(() => {
    const initial = initialRef.current;
    let stopped = false;
    const controller = new AbortController(),
      loaded = new Map<string, Loaded>();
    let accepted = "";
    const apply = async (catalog: RuntimeCatalog) => {
      if (catalog.revision === accepted) return;
      if (
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
          if (catalog.disabled.includes(plugin.id)) continue;
          const previous = loaded.get(plugin.id);
          if (previous?.build === plugin.build) {
            next.set(plugin.id, previous);
            continue;
          }
          const shared = await import(
            /* webpackIgnore: true */ /* turbopackIgnore: true */ assetURL(
              plugin,
              plugin.entries.shared,
            )
          );
          await stylesheet(plugin);
          const entryModule = plugin.entries.browser
            ? await import(
                /* webpackIgnore: true */ /* turbopackIgnore: true */ assetURL(
                  plugin,
                  plugin.entries.browser,
                )
              )
            : { default: {} };
          const components: Loaded["components"] = entryModule.default ?? {};
          const callbacks: (() => void)[] = [];
          if (typeof entryModule.activate === "function")
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
          next.set(plugin.id, {
            build: plugin.build,
            css: plugin.entries.css
              ? assetURL(plugin, plugin.entries.css)
              : undefined,
            components,
            plugin: shared.default,
            dispose: () => callbacks.forEach((callback) => callback()),
          });
        }
      } catch (error) {
        for (const [id, item] of next)
          if (loaded.get(id) !== item) item.dispose();
        for (const link of document.querySelectorAll<HTMLLinkElement>(
          "link[data-plugin-css]",
        )) {
          if (
            ![...loaded.values()].some(
              (item) => item.css === link.getAttribute("href"),
            )
          )
            link.remove();
        }
        throw error;
      }
      if (stopped) {
        for (const [id, item] of next)
          if (loaded.get(id) !== item) item.dispose();
        return;
      }
      installRuntimePlugins(
        [...next.values()].map((item) => item.plugin),
        catalog.disabled,
        catalog.revision,
      );
      refresh?.performReactRefresh();
      for (const [id, item] of loaded)
        if (next.get(id) !== item) item.dispose();
      loaded.clear();
      for (const [id, item] of next) loaded.set(id, item);
      const components = new Map(
        [...next].map(([id, item]) => [id, item.components]),
      );
      setValue({ catalog, components, loading: false });
      setUpdatePending(false);
      for (const link of document.querySelectorAll<HTMLLinkElement>(
        "link[data-plugin-css]",
      )) {
        const item = catalog.plugins.find(
          (plugin) =>
            plugin.id === link.dataset.pluginCss &&
            !catalog.disabled.includes(plugin.id),
        );
        if (
          !item?.entries.css ||
          link.getAttribute("href") !== assetURL(item, item.entries.css)
        )
          link.remove();
      }
      accepted = catalog.revision;
      setError("");
    };
    const poll = async (first = false) => {
      try {
        const catalog: RuntimeCatalog | null = first
          ? initial
          : await fetch("/__plugins/catalog", {
              cache: "no-store",
              credentials: "omit",
              signal: controller.signal,
            }).then(async (response) => {
              if (!response.ok) throw new Error("插件目录暂不可用");
              return response.json();
            });
        if (catalog) await apply(catalog);
      } catch {
        if (!stopped) setError("插件更新暂未完成，当前内容已保留。");
      }
    };
    let timer: ReturnType<typeof setTimeout>;
    const pollDelay = initial.development ? 15_000 : 60_000;
    const cycle = async () => {
      if (initial.development || document.visibilityState !== "hidden")
        await poll();
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
    };
  }, []);
  const diagnostics = value.catalog.development
    ? [
        ...value.catalog.errors.map(
          (item) => `${item.directory}：${item.message}`,
        ),
        ...(error ? [error] : []),
      ].join("\n")
    : "";
  const fonts = React.useMemo(
    () =>
      value.catalog.plugins
        .filter((plugin) => !value.catalog.disabled.includes(plugin.id))
        .flatMap((plugin) => plugin.fonts ?? []),
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
      {diagnostics && diagnostics !== dismissed && (
        <aside className={styles.error} role="alert">
          <strong>
            <client.UiText text="插件开发状态" />
          </strong>
          <pre>{diagnostics}</pre>
          <client.Button onClick={() => setDismissed(diagnostics)}>
            关闭提示
          </client.Button>
        </aside>
      )}
    </RuntimeContext.Provider>
  );
}

// Exported from one stable module so runtime-owned implementations do not recreate the wrapper.
export { RuntimeComponent };
