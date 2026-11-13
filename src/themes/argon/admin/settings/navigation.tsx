"use client";

import { UiText } from "@/core/i18n/provider";
import { useSettingsEditor } from "@/core/settings/editor";
import {
  activeThemeId,
  updateThemeProfile,
} from "@/core/settings/theme-options";
import { MenuEditor } from "./menu-editor";
import { SettingsFrame, SettingsSection } from "./shared";

export function NavigationSettingsPage() {
  const { draft, setDraft } = useSettingsEditor();
  const themeId = activeThemeId(draft);
  const profile = draft?.theme_options?.[themeId] ?? draft?.theme;
  const navigation = profile?.navigation ?? draft?.site.navigation ?? [];
  const usingLegacy = profile?.navigation == null;
  return (
    <SettingsFrame
      fullWidth
      title="导航菜单"
      description="导航跟随当前主题保存；切换主题后可使用各自的菜单结构。"
    >
      {draft && (
        <SettingsSection
          id="settings-navigation"
          title="当前主题导航"
          description="这份菜单用于顶栏。侧栏默认沿用，也可在主题设置中单独配置。"
        >
          <p className="admin-settings-hint">当前主题：{themeId}</p>
          {usingLegacy && (
            <p className="admin-settings-hint">
              <UiText text="当前显示旧站点导航作为兼容回退；保存后会写入当前主题。" />
            </p>
          )}
          <MenuEditor
            value={navigation}
            iconUrls={draft.icon_urls}
            onIconUrl={(id, url) =>
              setDraft((current) =>
                current
                  ? {
                      ...current,
                      icon_urls: { ...current.icon_urls, [id]: url },
                    }
                  : current,
              )
            }
            onChange={(next) =>
              setDraft((current) =>
                current
                  ? updateThemeProfile(current, themeId, {
                      navigation: next,
                    })
                  : current,
              )
            }
          />
        </SettingsSection>
      )}
    </SettingsFrame>
  );
}
