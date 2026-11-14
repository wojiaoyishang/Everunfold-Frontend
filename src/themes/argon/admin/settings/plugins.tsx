"use client";
import { useState } from "react";
import type { InstalledPlugin } from "@/core/contracts/settings";
import { PluginDetails } from "./plugin-details";
import { Icon } from "../../components/icon";
import { Modal } from "../../components/ui/modal";
import { can } from "@/core/accounts/permissions";
import {
  PluginAdminSettings,
  useHasPluginAdminSettings,
} from "@/core/plugins/admin-settings";
import { OptionalPluginBoundary } from "@/core/plugins/runtime/optional-component";
import styles from "./plugins.module.css";
import { UiText } from "@/core/i18n/provider";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { useSettingsEditor } from "@/core/settings/editor";
import { useExtensionCatalog } from "@/core/plugins/use-catalog";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import {
  isPluginReady,
  planRecommendedActivation,
  themePluginRecommendations,
} from "@/core/plugins/recommendations";
import { pluginMatchesSearch } from "@/core/plugins/search";
import { resourceUrl } from "@/core/content/urls";
import { MediaPreview } from "../media/media-preview";
import { SettingsFrame, SettingsSection, SettingsToggle } from "./shared";
import { Button, TextField } from "../../components/ui/primitives";

function pluginPreview(
  frontend: InstalledPlugin | undefined,
  backend: InstalledPlugin | undefined,
  backendUrl: string,
) {
  const local = resourceUrl(frontend?.preview);
  if (local) return local;
  const remote = resourceUrl(backend?.preview);
  return remote?.startsWith("/v1/extensions/artwork/")
    ? new URL(remote, backendUrl).href
    : remote;
}

function PluginConfiguration({ id, title }: { id: string; title: string }) {
  const hasSettings = useHasPluginAdminSettings(id);
  const writable = can(useAdminAccount(), "settings:write");
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  if (!hasSettings || !writable) return null;
  const close = () => setClosing(true);
  return (
    <>
      <Button
        className="admin-button"
        onClick={() => {
          setClosing(false);
          setOpen(true);
        }}
      >
        <Icon name="settings" />
        <UiText text="配置" />
      </Button>
      {open && (
        <Modal
          title={title}
          className={`admin-density-controls ${styles.configurationDialog}`}
          closeLabel="关闭插件配置"
          closing={closing}
          onClose={close}
          onExited={() => setOpen(false)}
        >
          <div className={styles.configurationBody}>
            <OptionalPluginBoundary
              fallback={
                <p role="alert">
                  <UiText text="暂时无法打开插件配置。" />
                </p>
              }
            >
              <PluginAdminSettings pluginId={id} onClose={close} />
            </OptionalPluginBoundary>
          </div>
        </Modal>
      )}
    </>
  );
}

export function PluginsSettingsPage() {
  const [detail, setDetail] = useState<{
    plugin: InstalledPlugin;
    preview: string | null;
  } | null>(null);
  const [search, setSearch] = useState("");
  const { baseUrl } = useAdminRequest();
  const { saved, draft, changePlugins } = useSettingsEditor();
  const { catalog } = usePluginRuntime();
  const deployed = useExtensionCatalog();
  const disabled = draft?.extensions?.disabled_plugins ?? [];
  const savedDisabled = saved?.value.extensions?.disabled_plugins ?? [];
  const activeTheme = saved?.value.extensions?.theme || catalog?.theme || "";
  const recommended = themePluginRecommendations(deployed.themes, activeTheme);
  const { required, unavailable } = planRecommendedActivation(
    deployed,
    recommended,
  );
  const toEnable = disabled.some((id) => required.has(id));
  const pendingActivation =
    !toEnable && savedDisabled.some((id) => required.has(id));
  const recommendationStatus = unavailable.length
    ? "推荐插件尚未全部完成部署。"
    : pendingActivation
      ? "已选中所有推荐插件，保存更改后生效。"
      : toEnable
        ? "选中后，保存更改即可启用。"
        : "推荐插件已全部启用。";
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
          <div className={styles.toolbarActions}>
            {recommended.length > 0 && (
              <Button
                className="admin-button"
                aria-describedby={
                  deployed.error ? undefined : "recommended-plugin-status"
                }
                disabled={
                  !draft ||
                  !!deployed.error ||
                  !!unavailable.length ||
                  !toEnable
                }
                onClick={() => changePlugins([...required], true)}
              >
                <Icon name="check" />
                <UiText text="启用所有推荐插件" />
              </Button>
            )}
            <Button
              className="admin-button"
              onClick={() => void deployed.reload()}
            >
              <Icon name="refresh" />
              <UiText text="刷新部署清单" />
            </Button>
          </div>
        </div>
        {recommended.length > 0 && !deployed.error && (
          <p
            id="recommended-plugin-status"
            className={styles.recommendationStatus}
            role="status"
          >
            <UiText text={recommendationStatus} />
          </p>
        )}
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
          const preview = pluginPreview(frontend, backend, baseUrl);
          const ready = isPluginReady(deployed, id);
          return (
            <section key={id} className={styles.row}>
              <div className={styles.summary}>
                <div className={styles.preview}>
                  {preview ? (
                    <MediaPreview
                      key={preview}
                      url={preview}
                      kind="image"
                      label={plugin?.title ?? id}
                      fallback={<Icon name="puzzle" />}
                    />
                  ) : (
                    <Icon name="puzzle" />
                  )}
                </div>
                <SettingsToggle
                  label={plugin?.title ?? id}
                  hint={
                    plugin?.description ||
                    "插件未安装，保留停用设置与现有内容。"
                  }
                  value={!disabled.includes(id)}
                  onChange={(enabled) => changePlugins([id], enabled)}
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
                {recommended.includes(id) && (
                  <span className={styles.recommended}>
                    <UiText text="主题推荐" />
                  </span>
                )}
                <span>
                  {plugin?.version} {plugin?.author && ` · ${plugin.author}`}
                </span>
                {plugin && (
                  <div
                    className={`admin-density-controls ${styles.rowActions}`}
                  >
                    {ready && !savedDisabled.includes(id) && (
                      <PluginConfiguration id={id} title={plugin.title} />
                    )}
                    <Button
                      className="admin-button"
                      onClick={() => setDetail({ plugin, preview })}
                    >
                      <Icon name="eye" />
                      <UiText text="查看详情" />
                    </Button>
                  </div>
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
          <PluginDetails {...detail} onClose={() => setDetail(null)} />
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
