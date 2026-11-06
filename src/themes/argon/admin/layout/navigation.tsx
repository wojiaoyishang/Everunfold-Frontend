import type { CSSProperties } from "react";
import {
  adminDestination,
  adminNavigationGroups,
} from "@/core/admin/navigation";
import type { AdminPageIcon } from "@/core/admin/registry";
import { useAdminAccount } from "@/core/admin/account-context";
import { adminRoutePermission, can } from "@/core/accounts/permissions";
import { Icon, type IconName } from "../../components/icon";
import { RouteLink } from "../../components/ui/route-link";
const navigationIcons: Record<AdminPageIcon, IconName> = {
  users: "user",
  font: "type",
  book: "book",
  leaf: "leaf",
  settings: "settings",
  theme: "sun",
  system: "cloud",
  overview: "grid",
  content: "copy",
  media: "image",
  extension: "grid",
};
export function AdminNavigation({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const current = adminDestination(pathname);
  const t = useT();
  const user = useAdminAccount();
  const groups = adminNavigationGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        const capability = adminRoutePermission(item.href);
        return !capability || can(user, capability);
      }),
    }))
    .filter((group) => group.items.length);
  return (
    <nav className="admin-navigation" aria-label={t("后台导航")}>
      {groups.map((group) => {
        const activeIndex = group.items.findIndex(
          (item) => item.id === current?.id,
        );
        return (
          <div className="admin-nav-group" key={group.id}>
            <span className="admin-nav-label">
              <UiText text={group.label} />
            </span>
            <div
              className="admin-nav-items"
              data-active={activeIndex >= 0}
              style={
                {
                  "--admin-active-index": Math.max(0, activeIndex),
                } as CSSProperties
              }
            >
              <span className="admin-nav-indicator" aria-hidden="true" />
              {group.items.map((item) => (
                <RouteLink
                  key={item.id}
                  href={item.href}
                  showPending
                  aria-current={current?.id === item.id ? "page" : undefined}
                  aria-label={t(item.label)}
                  title={t(item.label)}
                  className="admin-nav-link"
                  onClick={onNavigate}
                >
                  <Icon name={navigationIcons[item.icon]} />
                  <span className="admin-nav-text">
                    <UiText text={item.label} />
                  </span>
                </RouteLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
import { UiText, useT } from "@/core/i18n/provider";
