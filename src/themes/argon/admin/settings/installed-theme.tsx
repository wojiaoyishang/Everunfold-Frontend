"use client";
import { useSettingsEditor } from "@/core/settings/editor";
import { useExtensionCatalog } from "@/core/plugins/use-catalog";
import { UiText } from "@/core/i18n/provider";
import { SettingsSection } from "./shared";
import { Select } from "../../components/ui/select";
import { Button } from "../../components/ui/primitives";
export function InstalledThemeSection() {
  const { draft, setDraft } = useSettingsEditor();
  const deployed = useExtensionCatalog();
  return (
    <SettingsSection
      id="settings-installed-theme"
      title="已安装主题"
      description="切换已构建的前台主题。保存并同步后生效；后台继续使用管理主题。"
    >
      <div className="admin-settings-field">
        <label>
          <UiText text="前台主题" />
        </label>
        <Select
          programOptions
          name="installed-theme"
          label="前台主题"
          value={draft?.extensions?.theme ?? ""}
          options={[
            { value: "", label: "实例默认" },
            ...deployed.themes.map((theme) => ({
              value: theme.id,
              label: theme.title,
            })),
          ]}
          onValueChange={(theme) =>
            setDraft((value) =>
              value
                ? { ...value, extensions: { ...value.extensions, theme } }
                : value,
            )
          }
        />
        <small>
          {deployed.loading
            ? "正在读取部署清单…"
            : "仅可选择所有启用节点都已安装的主题。新增主题源码后需要重新构建主体。"}
        </small>
      </div>
      {deployed.error && (
        <div role="alert">
          <p>{deployed.error}</p>
          <Button
            className="admin-button"
            onClick={() => void deployed.reload()}
          >
            重新读取
          </Button>
        </div>
      )}
      {deployed.themes.map((theme) => (
        <p key={theme.id}>
          {theme.title} · {theme.version}
          {theme.parent ? ` · 继承 ${theme.parent}` : " · 主主题"}
        </p>
      ))}
    </SettingsSection>
  );
}
