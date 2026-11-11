"use client";
import { useState } from "react";
import type { InstalledPlugin } from "@/core/contracts/settings";
import { PluginDetails } from "./plugin-details";
import { Icon } from "../../components/icon";
import styles from "./plugins.module.css";
import { UiText } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import { useExtensionCatalog } from "@/core/plugins/use-catalog";
import { pluginMatchesSearch } from "@/core/plugins/search";
import { resourceUrl } from "@/core/content/urls";
import { MediaPreview } from "../media/media-preview";
import { SettingsFrame, SettingsSection, SettingsToggle } from "./shared";
import { Button, TextField } from "../../components/ui/primitives";
export function PluginsSettingsPage() {
  const [detail, setDetail] = useState<InstalledPlugin | null>(null);
  const [search, setSearch] = useState("");
  const { draft, setDraft, pluginChangeTrigger } = useSettingsEditor();
  const deployed = useExtensionCatalog();
  const disabled = draft?.extensions?.disabled_plugins ?? [];
  const ids = [
    ...new Set([
      ...deployed.plugins.map((p) => p.id),
      ...deployed.backendPlugins.map((p) => p.id),
      ...disabled,
    ]),
  ];
  const visibleIds = ids.filter((id) => {
    const frontend = deployed.plugins.find((plugin) => plugin.id === id);
    const backend = deployed.backendPlugins.find((plugin) => plugin.id === id);
    const plugin = frontend ?? backend;
    return pluginMatchesSearch(search, {
      id,
      title: plugin?.title,
      description: plugin?.description,
      version: plugin?.version,
      author: plugin?.author,
      page_ids: frontend?.page_ids,
      shortcodes: frontend?.shortcodes,
      components: frontend?.components,
      captcha_providers: backend?.captcha_providers,
    });
  });
  return (
    <SettingsFrame
      fullWidth
      title="插件管理"
      description="启用或禁用已部署插件；页面配置和历史内容会保留。"
    >
      <SettingsSection
        id="plugins-installed"
        title="已安装插件"
        description="插件由部署目录提供。停用后隐藏插件页面及插入入口，正文保留原始调用。"
      >
        <div className={styles.toolbar}>
          <label className="admin-search">
            <Icon name="search" />
            <TextField
              type="search"
              aria-label="搜索插件"
              placeholder="搜索名称、来源、版本或作者"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <Button
            className="admin-button"
            onClick={() => void deployed.reload()}
          >
            <Icon name="refresh" />
            <UiText text="刷新部署清单" />
          </Button>
        </div>
        {deployed.error && (
          <p role="alert">
            <UiText text={deployed.error} />
          </p>
        )}
        {deployed.loading && (
          <p role="status">
            <UiText text="正在读取部署清单…" />
          </p>
        )}
        {!deployed.loading && !ids.length && (
          <p>
            <UiText text="还没有已登记的插件。" />
          </p>
        )}
        {!deployed.loading && ids.length > 0 && !visibleIds.length && (
          <p className={styles.empty}>
            <UiText text="没有匹配的插件。" />
          </p>
        )}
        {!deployed.loading && deployed.catalog && !deployed.backendInSync && (
          <p role="status">
            <UiText text="后端插件目录有变更，完成部署同步后生效。" />
          </p>
        )}
        {visibleIds.map((id) => {
          const frontend = deployed.plugins.find((p) => p.id === id);
          const backend = deployed.backendPlugins.find((p) => p.id === id);
          const plugin = frontend ?? backend;
          const preview = resourceUrl(frontend?.preview || backend?.preview);
          const ready = Boolean(
            plugin &&
            (!backend || deployed.backendInSync) &&
            (!frontend ||
              (deployed.nodes.length &&
                deployed.nodes.every((node) =>
                  node.inventory?.plugins?.some(
                    (p) => p.id === id && p.build === plugin.build,
                  ),
                ))),
          );
          return (
            <section key={id} className={styles.row}>
              <div className={styles.summary}>
                <span className={styles.preview}>
                  {preview ? (
                    <MediaPreview
                      url={preview}
                      kind="image"
                      label={plugin?.title ?? id}
                    />
                  ) : (
                    <Icon name="puzzle" />
                  )}
                </span>
                <SettingsToggle
                  label={plugin?.title ?? id}
                  hint={
                    plugin?.description ||
                    "插件未安装，保留停用设置与现有内容。"
                  }
                  value={!disabled.includes(id)}
                  onChange={(enabled) => {
                    pluginChangeTrigger.current =
                      document.activeElement instanceof HTMLElement
                        ? document.activeElement
                        : null;
                    setDraft((value) =>
                      value
                        ? {
                            ...value,
                            extensions: {
                              ...value.extensions,
                              disabled_plugins: enabled
                                ? disabled.filter((item) => item !== id)
                                : [...disabled, id].sort(),
                            },
                          }
                        : value,
                    );
                  }}
                />
              </div>
              <div className={styles.meta}>
                <span className={styles.origin}>
                  <UiText
                    text={
                      frontend && backend
                        ? "前后端插件"
                        : backend
                          ? "后端插件"
                          : "前端插件"
                    }
                  />
                </span>
                <span>
                  {plugin?.version} {plugin?.author && ` · ${plugin.author}`}
                </span>
                {plugin && (
                  <Button
                    className="admin-button"
                    onClick={() => setDetail(plugin)}
                  >
                    <Icon name="eye" />
                    <UiText text="查看详情" />
                  </Button>
                )}
              </div>
              <small>
                {id}
                {plugin
                  ? ` · ${plugin.build.slice(0, 12)} · ${plugin.page_ids?.length ?? 0} 个页面 / ${plugin.shortcodes?.length ?? 0} 个短代码 / ${plugin.components?.length ?? 0} 个组件`
                  : ""}
              </small>
              {backend && (
                <small className="admin-extension-origin">
                  <UiText text={frontend ? "前后端插件" : "后端插件"} /> ·{" "}
                  {backend.version}
                  {backend.author ? ` · ${backend.author}` : ""}
                  {backend.captcha_providers?.length ? (
                    <>
                      {" "}
                      · <UiText text="验证码提供方" />{" "}
                      {backend.captcha_providers.length}
                    </>
                  ) : null}
                </small>
              )}
              {!ready && (
                <p>
                  <UiText
                    text={
                      backend && !deployed.backendInSync
                        ? "后端插件需要完成部署同步后才能启用。"
                        : "部分节点缺少相同构建，完成部署登记后才能启用。"
                    }
                  />
                </p>
              )}
            </section>
          );
        })}
        {detail && (
          <PluginDetails plugin={detail} onClose={() => setDetail(null)} />
        )}
        <details>
          <summary>
            <UiText text="节点部署记录" />
          </summary>
          {deployed.catalog?.nodes.map((node) => (
            <p key={node.node_id}>
              {node.node_id} ·{" "}
              {node.inventory
                ? `${node.inventory.plugins?.length ?? 0} 个插件、${node.inventory.themes?.length ?? 0} 个主题`
                : "尚未登记"}
              {node.reported_at
                ? ` · ${new Date(node.reported_at).toLocaleString()}`
                : ""}
              {!node.enabled ? " · 节点已停用" : ""}
            </p>
          ))}
        </details>
      </SettingsSection>
    </SettingsFrame>
  );
}
