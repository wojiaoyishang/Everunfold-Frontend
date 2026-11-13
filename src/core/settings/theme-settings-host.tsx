"use client";

import {
  createElement,
  lazy,
  Suspense,
  type ComponentType,
  type LazyExoticComponent,
} from "react";

import { useSettingsEditor } from "./editor";
import { activeThemeId } from "./theme-options";
import { SettingsFrame } from "@/themes/argon/admin/settings/shared";
import { InstalledThemeSection } from "@/themes/argon/admin/settings/installed-theme";
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
  const { draft } = useSettingsEditor();
  const theme = activeThemeId(draft);
  const Panel = panels.get(theme);
  return (
    <SettingsFrame
      title="主题设置"
      description="主题切换保持在公共设置；当前主题的外观与阅读选项由主题自行提供。"
    >
      <InstalledThemeSection />
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
