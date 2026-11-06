"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import type { AuthUser } from "@/core/contracts/auth";
import type { AdminPreferences } from "@/core/admin/preferences";
import { adminDestination } from "@/core/admin/navigation";
import { isLivePreviewPath } from "@/core/preview/routes";
import { isManagedPagePreviewPath } from "@/core/pages/preview";
import { isContentPreviewPath } from "@/core/content-management/preview";
import { Icon } from "../../components/icon";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { AdminAppearance } from "../components/preferences";
import { AdminNavigation } from "./navigation";
import { AdminMobileNavigation } from "./mobile-navigation";
import { InterfaceLanguage } from "../../components/language-switcher";
import { AdminLanguageCatalog } from "@/core/i18n/admin-languages";
import { adminRoutePermission, can } from "@/core/accounts/permissions";
import { Avatar } from "../../components/ui/avatar";

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
  const [embedded] = useState(
    () =>
      typeof window !== "undefined" &&
      window.parent !== window &&
      window.name.startsWith("everunfold-live-editor"),
  );
  useEffect(() => {
    if (embedded)
      window.parent.postMessage(
        {
          type: "everunfold:embedded-location",
          path: window.location.pathname + window.location.search,
        },
        window.location.origin,
      );
  }, [embedded, pathname]);

  const destination = adminDestination(pathname);
  const name = user.display_name || user.username;
  const capability = adminRoutePermission(pathname);
  const allowed =
    (!capability || can(user, capability)) &&
    (!/\/(?:new|edit)$/.test(pathname) ||
      can(user, "content:write") ||
      pathname.startsWith("/admin/users") ||
      (pathname.startsWith("/admin/pages") && can(user, "pages:write")));
  // Keep the confirmed account/request boundary, while the preview owns the public theme shell.
  if (
    allowed &&
    destination &&
    (isContentPreviewPath(pathname) ||
      isManagedPagePreviewPath(pathname) ||
      isLivePreviewPath(pathname))
  )
    return children;
  if (allowed && destination && embedded)
    return (
      <AdminLanguageCatalog>
        <main
          className="admin-root admin-embedded-editor"
          data-surface="admin"
          data-admin-mode={preferences.mode}
          data-density="compact"
          data-admin-motion={preferences.motion}
        >
          {children}
        </main>
      </AdminLanguageCatalog>
    );
  return (
    <AdminLanguageCatalog>
      <div
        className="admin-root admin-shell"
        data-surface="admin"
        data-admin-mode={preferences.mode}
        data-density={preferences.density}
        data-admin-motion={preferences.motion}
        data-collapsed={preferences.sidebarCollapsed}
      >
        <RouteLink href="#admin-main" className="admin-skip-link">
          <UiText text="跳至主要内容" />
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
              <span className="admin-breadcrumb-root">
                <UiText text="工作空间" />
              </span>
              <Icon name="chevron" />
              <span className="admin-breadcrumb-current" key={pathname}>
                <UiText text={destination?.label ?? "后台"} />
              </span>
            </div>
            <div className="admin-header-dock" data-admin-header-dock />
            <nav className="admin-header-actions" aria-label="工作空间操作">
              <InterfaceLanguage />
              <RouteLink href="/" className="admin-site-link" title="访问站点">
                <Icon name="external" />
                <span>
                  <UiText text="访问站点" />
                </span>
              </RouteLink>
              <AdminAppearance
                preferences={preferences}
                onChange={onPreferencesChange}
              />
              <span className="admin-header-divider" />
              <RouteLink
                href="/account"
                className="admin-account"
                title="账号中心"
                aria-label="账号中心"
              >
                <Avatar
                  name={name}
                  src={user.avatar_url}
                  size={32}
                  className="admin-account-avatar"
                />
                <span className="admin-account-name">{name}</span>
              </RouteLink>
              <Button
                className="admin-icon-button"
                aria-label="退出登录"
                title="退出登录"
                onClick={() => void onSignOut()}
              >
                <Icon name="logout" />
              </Button>
            </nav>
            <span className="admin-navigation-progress" aria-hidden="true" />
          </header>
          <main id="admin-main" tabIndex={-1} className="admin-main">
            <div className="admin-page">
              {allowed ? (
                children
              ) : (
                <section className="admin-panel">
                  <h1>
                    <UiText text="没有访问此页面的权限" />
                  </h1>
                  <p>
                    <UiText text="请联系管理员调整授权，或返回账号中心。" />
                  </p>
                  <RouteLink href="/account" className="admin-button">
                    <UiText text="账号中心" />
                  </RouteLink>
                </section>
              )}
            </div>
          </main>
        </div>
      </div>
    </AdminLanguageCatalog>
  );
}
