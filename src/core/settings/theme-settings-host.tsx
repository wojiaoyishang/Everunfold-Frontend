"use client";

import {
  createElement,
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

import { useSettingsEditor } from "./editor";
import {
  activeThemeId,
  fontScaleLimits,
  themeProfile,
  updateThemeProfile,
} from "./theme-options";
import {
  SettingsFrame,
  SettingsSection,
} from "@/themes/argon/admin/settings/shared";
import { InstalledThemeSection } from "@/themes/argon/admin/settings/installed-theme";
import { RangeField } from "@/themes/argon/components/ui/range-field";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText } from "@/core/i18n/provider";
import { Icon } from "@/themes/argon/components/icon";
import type { Taxonomy } from "@/core/content/types";

export type ThemeSettingsProps = {
  taxonomies?: readonly Pick<Taxonomy, "id" | "kind" | "name" | "slug">[];
};
type ThemeSettingsModule = { default: ComponentType<ThemeSettingsProps> };
const modules = import.meta.glob<ThemeSettingsModule>(
  "/src/themes/*/theme-settings.tsx",
);
const panels = new Map<
  string,
  LazyExoticComponent<ComponentType<ThemeSettingsProps>>
>(
  Object.entries(modules).map(([file, load]) => [
    /\/src\/themes\/([^/]+)\//.exec(file)?.[1] ?? "",
    lazy(load),
  ]),
);

function ThemeUnavailable({ id }: { id: string }) {
  return (
    <section className="admin-settings-section">
      <Icon name="cloud-off" />
      <h2>
        <UiText text="当前主题没有可用设置面板" />
      </h2>
      <p>{id}</p>
    </section>
  );
}

export function ThemeSettingsHost(props: ThemeSettingsProps) {
  const { draft, setDraft } = useSettingsEditor();
  const writable = can(useAdminAccount(), "settings:write");
  const theme = activeThemeId(draft);
  const profile = themeProfile(draft, theme);
  const Panel = panels.get(theme);
  return (
    <SettingsFrame
      title="主题设置"
      description="主题切换保持在公共设置；当前主题的外观与阅读选项由主题自行提供。"
    >
      <InstalledThemeSection />
      {profile && (
        <SettingsSection
          id="settings-font-scale"
          title="字体缩放"
          description="默认缩放适用于所有前台文字，访客可以在阅读设置中调整。"
        >
          <label className="admin-settings-field">
            <span>
              <span id="default-font-scale-label">
                <UiText text="默认字体缩放" />
              </span>{" "}
              <output>{profile.font_scale_percent}%</output>
            </span>
            <RangeField
              aria-labelledby="default-font-scale-label"
              aria-valuetext={`${profile.font_scale_percent}%`}
              disabled={!writable}
              min={fontScaleLimits.min}
              max={fontScaleLimits.max}
              value={profile.font_scale_percent}
              onChange={(event) => {
                const font_scale_percent = event.currentTarget.valueAsNumber;
                setDraft((current) =>
                  current
                    ? updateThemeProfile(current, theme, { font_scale_percent })
                    : current,
                );
              }}
            />
          </label>
        </SettingsSection>
      )}
      {draft ? (
        Panel ? (
          <Suspense
            fallback={
              <div className="admin-settings-loading" role="status">
                <UiText text="正在读取主题设置…" />
              </div>
            }
          >
            {createElement(Panel, props)}
          </Suspense>
        ) : (
          <ThemeUnavailable id={theme} />
        )
      ) : (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取主题设置…" />
        </div>
      )}
    </SettingsFrame>
  );
}
