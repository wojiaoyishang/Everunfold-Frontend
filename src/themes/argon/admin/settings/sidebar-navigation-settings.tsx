"use client";

import type {
  MenuItem,
  SidebarNavigationPreferences,
  SitePreferences,
  ThemePreferences,
} from "@/core/contracts/settings";
import { useLocale, UiText } from "@/core/i18n/provider";
import { sidebarIdentity } from "../../navigation";
import { Button } from "../../components/ui/primitives";
import { MenuEditor } from "./menu-editor";
import { SettingsSection, SettingsText, SettingsToggle } from "./shared";
import { SidebarNavigationPreview } from "./sidebar-navigation-preview";

export function SidebarNavigationSettings({
  site,
  theme,
  iconUrls,
  onIconUrl,
  onChange,
}: {
  site: SitePreferences;
  theme: ThemePreferences;
  iconUrls: Record<string, string>;
  onIconUrl: (id: string, url: string) => void;
  onChange: (value: SidebarNavigationPreferences) => void;
}) {
  const { locale } = useLocale();
  const settings = theme.sidebar_navigation ?? {};
  const update = (patch: Partial<SidebarNavigationPreferences>) =>
    onChange({ ...settings, ...patch });
  const inheritedMenu: MenuItem[] = theme.navigation ?? site.navigation ?? [];
  const inherits = settings.menu == null;
  const menu = settings.menu ?? inheritedMenu;
  const identity = sidebarIdentity(
    { ...site, hero_title: theme.hero_title ?? "" },
    site.author_tagline,
    settings,
  );
  return (
    <>
      <SettingsSection
        id="settings-sidebar-navigation"
        title="侧栏导航卡片"
        description="配置顶部文案、导航和全局搜索入口。"
      >
        <div className="admin-sidebar-settings-layout">
          <div className="admin-sidebar-settings-fields">
            <SettingsToggle
              label="显示侧栏顶部横幅"
              value={settings.show_banner !== false}
              onChange={(show_banner) => update({ show_banner })}
            />
            {settings.show_banner !== false && (
              <>
                <SettingsText
                  label="侧栏标题"
                  value={identity.title}
                  maxLength={160}
                  onChange={(title) => update({ title })}
                />
                <SettingsText
                  label="侧栏别名"
                  value={identity.alias}
                  maxLength={100}
                  onChange={(alias) => update({ alias })}
                />
                <SettingsText
                  label="侧栏格言"
                  value={identity.tagline}
                  maxLength={300}
                  onChange={(tagline) => update({ tagline })}
                />
                <div>
                  <Button
                    className="admin-button"
                    onClick={() =>
                      update({ title: null, alias: null, tagline: null })
                    }
                  >
                    <UiText text="恢复侧栏默认文案" />
                  </Button>
                </div>
              </>
            )}
            <SettingsToggle
              label="显示侧栏搜索按钮"
              value={settings.show_search !== false}
              onChange={(show_search) => update({ show_search })}
            />
            {settings.show_search !== false && (
              <SettingsText
                label="搜索按钮文字"
                value={settings.search_label ?? ""}
                maxLength={60}
                hint="留空显示「搜索」。"
                onChange={(search_label) => update({ search_label })}
              />
            )}
          </div>
          <SidebarNavigationPreview
            identity={identity}
            showBanner={settings.show_banner !== false}
            showSearch={settings.show_search !== false}
            searchLabel={settings.search_label ?? ""}
            menu={menu}
            iconUrls={iconUrls}
            accent={theme.accent ?? "#673bb7"}
            locale={locale}
          />
        </div>
      </SettingsSection>
      <SettingsSection
        id="settings-sidebar-menu"
        title="侧栏菜单"
        description="桌面侧栏和手机抽屉使用同一份菜单。"
      >
        <SettingsToggle
          label="沿用顶栏菜单"
          value={inherits}
          onChange={(inherit) =>
            update({ menu: inherit ? null : inheritedMenu })
          }
        />
        {!inherits && (
          <MenuEditor
            value={menu}
            iconUrls={iconUrls}
            onIconUrl={onIconUrl}
            onChange={(menu) => update({ menu })}
          />
        )}
      </SettingsSection>
    </>
  );
}
