"use client";
import { useSettingsEditor } from "@/core/settings/editor";
import { useExtensionCatalog } from "@/core/plugins/use-catalog";
import { UiText, useT } from "@/core/i18n/provider";
import { SettingsSection } from "./shared";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { ThemeCard } from "./theme-card";
import styles from "./theme-card.module.css";
export function InstalledThemeSection() {
  const { draft, setDraft } = useSettingsEditor();
  const deployed = useExtensionCatalog();
  const t = useT();
  const selected = draft?.extensions?.theme ?? "";
  const select = (theme: string) =>
    setDraft((value) =>
      value ? { ...value, extensions: { ...value.extensions, theme } } : value,
    );
  return (
    <SettingsSection
      id="settings-installed-theme"
      title="已安装主题"
      description="切换已构建的前台主题。保存并同步后生效；后台继续使用管理主题。"
    >
      <div role="group" aria-label={t("前台主题")}>
        <div className={styles.controls}>
          <Button
            className="admin-button"
            aria-pressed={selected === ""}
            onClick={() => select("")}
          >
            {selected === "" && <Icon name="check" />}
            <UiText text="实例默认" />
          </Button>
          <small>
            <UiText text="仅可选择所有启用节点都已安装的主题。新增主题源码后需要重新构建主体。" />
          </small>
        </div>
        {deployed.loading && (
          <p role="status">
            <UiText text="正在读取部署清单…" />
          </p>
        )}
        {deployed.error && (
          <div role="alert">
            <p>
              <UiText text={deployed.error} />
            </p>
            <Button
              className="admin-button"
              onClick={() => void deployed.reload()}
            >
              <UiText text="重新读取" />
            </Button>
          </div>
        )}
        {!deployed.loading && !deployed.error && !deployed.themes.length && (
          <p>
            <UiText text="没有可用的已安装主题。" />
          </p>
        )}
        {!deployed.loading &&
          !deployed.error &&
          selected &&
          !deployed.themes.some((theme) => theme.id === selected) && (
            <p role="status">
              <UiText text="所选主题尚未在所有启用节点完成部署。" /> {selected}
            </p>
          )}
        <div className={styles.grid}>
          {deployed.themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              selected={selected === theme.id}
              onSelect={() => select(theme.id)}
            />
          ))}
        </div>
      </div>
    </SettingsSection>
  );
}
