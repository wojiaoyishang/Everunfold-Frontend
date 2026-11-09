"use client";
import { useRef, useState } from "react";
import type { InstalledTheme } from "@/core/contracts/settings";
import { useSettingsEditor } from "@/core/settings/editor";
import { useThemeView } from "@/core/settings/use-theme-view";
import { useExtensionCatalog } from "@/core/plugins/use-catalog";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { UiText, useT } from "@/core/i18n/provider";
import { SettingsSection } from "./shared";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { ThemeCard } from "./theme-card";
import { ThemeDetails } from "./theme-details";
import { useHorizontalScroll } from "../../hooks/use-horizontal-scroll";
import styles from "./theme-card.module.css";
export function InstalledThemeSection() {
  const { saved } = useSettingsEditor();
  const deployed = useExtensionCatalog();
  const { catalog } = usePluginRuntime();
  const { view, change } = useThemeView();
  const track = useRef<HTMLDivElement>(null);
  const { previous, next, move } = useHorizontalScroll(
    track,
    view === "cards",
    deployed.themes.length,
  );
  const [details, setDetails] = useState<InstalledTheme | "default" | null>(
    null,
  );
  const t = useT();
  const selected = saved?.value.extensions?.theme ?? "";
  const active = catalog?.theme ?? selected;
  return (
    <SettingsSection
      id="settings-installed-theme"
      title="已安装主题"
      description="查看主题详情后启用，节点同步后生效；后台继续使用管理主题。"
    >
      <div role="group" aria-label={t("前台主题")}>
        <div className={styles.controls}>
          <Button
            className="admin-button"
            data-active={selected === ""}
            aria-haspopup="dialog"
            onClick={() => setDetails("default")}
          >
            {selected === "" && <Icon name="check" />}
            <UiText text="实例默认" />
          </Button>
          <small>
            <UiText text="仅可选择所有启用节点都已安装的主题。新增主题源码后需要重新构建主体。" />
          </small>
        </div>
        <div className={styles.browserControls}>
          <div
            className={styles.views}
            role="group"
            aria-label={t("主题浏览方式")}
          >
            <Button
              className="admin-button"
              aria-pressed={view === "cards"}
              onClick={() => change("cards")}
            >
              <Icon name="grid" />
              <UiText text="卡片" />
            </Button>
            <Button
              className="admin-button"
              aria-pressed={view === "list"}
              onClick={() => change("list")}
            >
              <Icon name="list" />
              <UiText text="列表" />
            </Button>
          </div>
          {view === "cards" && (previous || next) && (
            <div className={styles.arrows}>
              <Button
                className="admin-icon-button"
                aria-label={t("上一组主题")}
                disabled={!previous}
                onClick={() => move(-1)}
              >
                <Icon name="chevron-left" />
              </Button>
              <Button
                className="admin-icon-button"
                aria-label={t("下一组主题")}
                disabled={!next}
                onClick={() => move(1)}
              >
                <Icon name="chevron" />
              </Button>
            </div>
          )}
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
        <div
          className={styles.grid}
          data-view={view}
          ref={track}
          role="region"
          aria-label={t("已安装主题")}
          tabIndex={view === "cards" && (previous || next) ? 0 : undefined}
        >
          {deployed.themes.map((theme) => (
            <ThemeCard
              key={theme.id}
              theme={theme}
              active={active === theme.id}
              onOpen={() => setDetails(theme)}
            />
          ))}
        </div>
      </div>
      {details !== null && (
        <ThemeDetails
          theme={details === "default" ? null : details}
          onClose={() => setDetails(null)}
        />
      )}
    </SettingsSection>
  );
}
