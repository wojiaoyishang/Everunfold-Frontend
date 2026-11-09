"use client";
import { UiText, useT } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";

export function PluginImpactDialog() {
  const editor = useSettingsEditor();
  const impact = editor.pluginImpact;
  const t = useT();
  return (
    <ConfirmDialog
      open={Boolean(impact)}
      title="确认插件启停"
      description="停用会隐藏相关页面和插入入口，正文中的插件功能可能无法显示。配置和源内容会保留，重新启用后可恢复。"
      icon="grid"
      confirmLabel="继续并保存"
      busyLabel="正在保存"
      busy={editor.busy}
      returnFocus={editor.pluginChangeTrigger}
      error={editor.error ? t(editor.error) : undefined}
      onCancel={editor.cancelPluginChange}
      onConfirm={editor.confirmPluginChange}
      onConfirmed={editor.dismissPluginImpact}
    >
      <ul className="admin-plugin-impact-list">
        {impact?.plugins.map((plugin) => (
          <li key={plugin.plugin_id}>
            <div className="admin-plugin-impact-heading">
              <strong>
                <UiText text={plugin.title} />
              </strong>
              <span>
                <UiText
                  text={
                    impact.input.value.extensions?.disabled_plugins?.includes(
                      plugin.plugin_id,
                    )
                      ? "将停用"
                      : "将启用"
                  }
                />
              </span>
            </div>
            <small>{plugin.plugin_id}</small>
            <dl className="admin-plugin-impact-counts">
              {(
                [
                  ["已应用页面", plugin.applied_pages],
                  ["已发布内容", plugin.published_contents],
                  ["定时发布内容", plugin.scheduled_contents],
                  ["验证码配置", plugin.captcha_references],
                  ["运行中的任务", plugin.active_tasks],
                ] as const
              )
                .filter(([, count]) => (count ?? 0) > 0)
                .map(([label, count]) => (
                  <div key={label}>
                    <dt>
                      <UiText text={label} />
                    </dt>
                    <dd>{count}</dd>
                  </div>
                ))}
            </dl>
            {!plugin.registered && (
              <p>
                <UiText text="未能取得完整注册信息，请确认该插件的使用情况后继续。" />
              </p>
            )}
          </li>
        ))}
      </ul>
      {impact?.plugins.some(
        (plugin) => (plugin.captcha_references ?? 0) > 0,
      ) && (
        <p>
          <UiText text="停用验证码组件后，相关验证将暂时无法完成。请先切换到其他验证方式，或确认后继续。" />
        </p>
      )}
      <p>
        <UiText text="检查覆盖当前已应用页面、已发布正文和定时发布版本中的短代码引用；不含历史草稿或脚本动态调用。取消将撤销本次插件开关修改，其他设置修改仍保留。" />
      </p>
    </ConfirmDialog>
  );
}
