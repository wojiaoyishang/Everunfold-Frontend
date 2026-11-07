"use client";
import { UiText } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import { useExtensionCatalog } from "@/core/plugins/use-catalog";
import { SettingsFrame, SettingsSection, SettingsToggle } from "./shared";
import { Button } from "../../components/ui/primitives";
export function PluginsSettingsPage() {
  const { draft, setDraft } = useSettingsEditor();
  const deployed = useExtensionCatalog();
  const disabled = draft?.extensions?.disabled_plugins ?? [];
  const ids = [...new Set([...deployed.plugins.map((p) => p.id), ...disabled])];
  return (
    <SettingsFrame
      title="插件管理"
      description="启用或禁用已部署插件；页面配置和历史内容会保留。"
    >
      <SettingsSection
        id="plugins-installed"
        title="已安装插件"
        description="插件由部署目录提供。停用后隐藏插件页面及插入入口，正文保留原始调用。"
      >
        <Button className="admin-button" onClick={() => void deployed.reload()}>
          刷新部署清单
        </Button>
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
        {ids.map((id) => {
          const plugin = deployed.plugins.find((p) => p.id === id);
          const ready = Boolean(
            plugin &&
            deployed.nodes.length &&
            deployed.nodes.every((node) =>
              node.inventory?.plugins?.some(
                (p) => p.id === id && p.build === plugin.build,
              ),
            ),
          );
          return (
            <section key={id} className="admin-extension-card">
              <SettingsToggle
                label={plugin?.title ?? id}
                hint={
                  plugin?.description || "插件未安装，保留停用设置与现有内容。"
                }
                value={!disabled.includes(id)}
                onChange={(enabled) =>
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
                  )
                }
              />
              <small>
                {id}
                {plugin
                  ? ` · ${plugin.build.slice(0, 12)} · ${plugin.page_ids?.length ?? 0} 个页面 / ${plugin.shortcodes?.length ?? 0} 个短代码 / ${plugin.components?.length ?? 0} 个组件`
                  : ""}
              </small>
              {!ready && (
                <p>
                  <UiText text="部分节点缺少相同构建，完成部署登记后才能启用。" />
                </p>
              )}
            </section>
          );
        })}
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
