import type { CSSProperties } from "react";
import {
  adminDestination,
  adminNavigationGroups,
} from "@/core/admin/navigation";
import type { AdminPageIcon } from "@/core/admin/registry";
import { Icon, type IconName } from "../../components/icon";
import { RouteLink } from "../../components/ui/route-link";
const navigationIcons: Record<AdminPageIcon, IconName> = {
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
  return (
    <nav className="admin-navigation" aria-label="后台导航">
      {adminNavigationGroups.map((group) => {
        const activeIndex = group.items.findIndex(
          (item) => item.id === current?.id,
        );
        return (
          <div className="admin-nav-group" key={group.id}>
            <span className="admin-nav-label">{group.label}</span>
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
                  aria-label={item.label}
                  title={item.label}
                  className="admin-nav-link"
                  onClick={onNavigate}
                >
                  <Icon name={navigationIcons[item.icon]} />
                  <span className="admin-nav-text">{item.label}</span>
                </RouteLink>
              ))}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
