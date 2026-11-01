"use client";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/generated/auth-contract";
import type { AdminPreferences } from "@/core/admin/preferences";
import { adminDestination } from "@/core/admin/navigation";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminAppearance } from "../components/preferences";
import { AdminNavigation } from "./navigation";
import { AdminMobileNavigation } from "./mobile-navigation";

export function AdminShell({
  user,
  preferences,
  onPreferencesChange,
  onSignOut,
  children,
}: {
  user: AuthUser;
  preferences: AdminPreferences;
  onPreferencesChange: (patch: Partial<AdminPreferences>) => void;
  onSignOut: () => Promise<void>;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const destination = adminDestination(pathname);
  const name = user.display_name || user.username;
  return (
    <div
      className="admin-root admin-shell"
      data-surface="admin"
      data-admin-mode={preferences.mode}
      data-density={preferences.density}
      data-collapsed={preferences.sidebarCollapsed}
    >
      <RouteLink href="#admin-main" className="admin-skip-link">
        跳至主要内容
      </RouteLink>
      <aside className="admin-sidebar">
        <RouteLink
          href="/admin"
          className="admin-brand"
          aria-label="Everunfold 工作台"
        >
          <span className="admin-brand-mark">
            <Icon name="book" />
          </span>
          <span>Everunfold</span>
        </RouteLink>
        <AdminNavigation pathname={pathname} />
        <div className="admin-sidebar-bottom">
          <div className="admin-sidebar-note">
            <span>你的内容工作空间</span>
            <small>专注创作，有序整理。</small>
          </div>
        </div>
      </aside>
      <div className="admin-main-column">
        <header className="admin-header">
          <div className="admin-header-location">
            <Button
              className="admin-icon-button admin-desktop-toggle"
              aria-label={
                preferences.sidebarCollapsed ? "展开侧栏" : "收起侧栏"
              }
              title={preferences.sidebarCollapsed ? "展开侧栏" : "收起侧栏"}
              aria-pressed={preferences.sidebarCollapsed}
              onClick={() =>
                onPreferencesChange({
                  sidebarCollapsed: !preferences.sidebarCollapsed,
                })
              }
            >
              <Icon name="sidebar" />
            </Button>
            <AdminMobileNavigation pathname={pathname} />
            <span className="admin-breadcrumb-root">工作空间</span>
            <Icon name="chevron" />
            <span>{destination?.label ?? "后台"}</span>
          </div>
          <nav className="admin-header-actions" aria-label="工作空间操作">
            <RouteLink href="/" className="admin-site-link" title="访问站点">
              <Icon name="external" />
              <span>访问站点</span>
            </RouteLink>
            <AdminAppearance
              preferences={preferences}
              onChange={onPreferencesChange}
            />
            <span className="admin-header-divider" />
            <div className="admin-account" title={`${name} · 管理员`}>
              <span className="admin-account-avatar" aria-hidden="true">
                {Array.from(name)[0]}
              </span>
              <span className="admin-account-name">{name}</span>
            </div>
            <Button
              className="admin-icon-button"
              aria-label="退出登录"
              title="退出登录"
              onClick={() => void onSignOut()}
            >
              <Icon name="logout" />
            </Button>
          </nav>
        </header>
        <main id="admin-main" tabIndex={-1} className="admin-main">
          <div className="admin-page" key={pathname}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
