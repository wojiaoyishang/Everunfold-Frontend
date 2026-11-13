"use client";

import { useState, type CSSProperties } from "react";
import type { MenuItem } from "@/core/contracts/settings";
import { UiText, useT } from "@/core/i18n/provider";
import { localizedMenuLabel } from "@/core/navigation/labels";
import { Icon } from "../../components/icon";
import { LibraryIcon } from "../../components/library-icon";
import { Modal } from "../../components/ui/modal";
import { Button, TextField } from "../../components/ui/primitives";
import {
  SidebarBanner,
  SidebarSearchButton,
} from "../../components/sidebar-navigation-panel";
import type { sidebarIdentity } from "../../navigation";

function PreviewMenu({
  items,
  iconUrls,
  locale,
  depth = 0,
}: {
  items: MenuItem[];
  iconUrls: Record<string, string>;
  locale: string;
  depth?: number;
}) {
  return (
    <ul className="admin-sidebar-preview-menu">
      {items.map((item, index) => {
        const label = localizedMenuLabel(item, locale);
        const children = item.children ?? [];
        const row = (
          <>
            <LibraryIcon
              name={item.icon ?? "link"}
              url={iconUrls[item.icon ?? ""]}
            />
            <span>{label || <UiText text="未命名菜单项" />}</span>
            {children.length > 0 && (
              <Icon name="chevron" className="admin-sidebar-preview-chevron" />
            )}
          </>
        );
        return (
          <li
            key={item.id}
            style={
              { "--preview-menu-depth": Math.min(depth, 3) } as CSSProperties
            }
          >
            {children.length ? (
              <details>
                <summary
                  className="admin-sidebar-preview-row"
                  data-active={depth === 0 && index === 0}
                >
                  {row}
                </summary>
                <PreviewMenu
                  items={children}
                  iconUrls={iconUrls}
                  locale={locale}
                  depth={depth + 1}
                />
              </details>
            ) : (
              <div
                className="admin-sidebar-preview-row"
                data-active={depth === 0 && index === 0}
              >
                {row}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function SidebarNavigationPreview({
  identity,
  showBanner,
  showSearch,
  searchLabel,
  menu,
  iconUrls,
  accent,
  locale,
}: {
  identity: ReturnType<typeof sidebarIdentity>;
  showBanner: boolean;
  showSearch: boolean;
  searchLabel: string;
  menu: MenuItem[];
  iconUrls: Record<string, string>;
  accent: string;
  locale: string;
}) {
  const t = useT();
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");
  const [searchOpen, setSearchOpen] = useState(false);
  return (
    <div className="admin-sidebar-preview">
      <div className="admin-sidebar-preview-tools">
        <strong>
          <UiText text="侧栏实时预览" />
        </strong>
        <div role="group" aria-label={t("预览尺寸")}>
          <Button
            className="admin-button"
            aria-pressed={mode === "desktop"}
            onClick={() => setMode("desktop")}
          >
            <UiText text="桌面" />
          </Button>
          <Button
            className="admin-button"
            aria-pressed={mode === "mobile"}
            onClick={() => setMode("mobile")}
          >
            <UiText text="手机" />
          </Button>
        </div>
      </div>
      <p>
        <UiText text="预览使用当前表单值。菜单可展开，链接和搜索不跳转。" />
      </p>
      <div
        className="admin-sidebar-preview-stage"
        data-sidebar-preview={mode}
        style={{ "--brand-accent": accent } as CSSProperties}
      >
        <div className="admin-sidebar-preview-card">
          {showBanner && <SidebarBanner {...identity} />}
          {menu.length > 0 && (
            <PreviewMenu items={menu} iconUrls={iconUrls} locale={locale} />
          )}
          {showSearch && (
            <SidebarSearchButton
              label={searchLabel}
              onClick={() => setSearchOpen(true)}
            />
          )}
        </div>
      </div>
      {searchOpen && (
        <Modal
          title="全局搜索示例"
          closeLabel="关闭搜索示例"
          onClose={() => setSearchOpen(false)}
        >
          <div className="admin-sidebar-preview-search">
            <label className="admin-settings-field">
              <UiText text="搜索关键词" />
              <TextField placeholder={t("搜索文章、说说或术语…")} autoFocus />
            </label>
            <p>
              <UiText text="这里仅展示搜索框样式。" />
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
}
