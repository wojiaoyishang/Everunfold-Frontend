"use client";

import { useId, useState } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import {
  adminDestination,
  adminNavigationGroups,
} from "@/core/admin/navigation";
import {
  adminMenuEntries,
  type AdminPageIcon,
  type AdminPageRegistration,
} from "@/core/admin/registry";
import { useAdminAccount } from "@/core/admin/account-context";
import { adminRoutePermission, can } from "@/core/accounts/permissions";
import { Icon, type IconName } from "../../components/icon";
import { RouteLink } from "../../components/ui/route-link";
import { Button } from "../../components/ui/primitives";
import { AdminNavigationFlyout } from "./navigation-flyout";
const navigationIcons: Record<AdminPageIcon, IconName> = {
  comment: "comment",
  users: "user",
  lock: "lock",
  font: "type",
  book: "book",
  leaf: "leaf",
  settings: "settings",
  theme: "sun",
  system: "server",
  "node-settings": "sliders",
  runtime: "activity",
  overview: "grid",
  content: "copy",
  media: "image",
  extension: "puzzle",
  icons: "shapes",
  shortcode: "shortcode",
  applications: "plug",
  taxonomy: "tag",
  mail: "mail",
};
export function AdminNavigation({
  pathname,
  onNavigate,
  flyouts = false,
  collapsed = false,
  onExpand,
}: {
  pathname: string;
  onNavigate?: () => void;
  flyouts?: boolean;
  collapsed?: boolean;
  onExpand?: () => void;
}) {
  const current = adminDestination(pathname),
    t = useT(),
    user = useAdminAccount();
  const id = useId();
  const groups = adminNavigationGroups
    .map((group) => ({
      ...group,
      entries: adminMenuEntries(group, (item) => {
        const capability = adminRoutePermission(item.href);
        return (
          !capability ||
          can(
            user,
            capability,
            item.href === "/admin/taxonomies" ? null : undefined,
          )
        );
      }),
    }))
    .filter((group) => group.entries.length);
  const [expansion, setExpansion] = useState<{
    pathname: string;
    branch: string | undefined;
  } | null>(null);
  const expanded =
    expansion?.pathname === pathname ? expansion.branch : current?.menu?.branch;
  const link = (item: AdminPageRegistration, onSelect?: () => void) => (
    <RouteLink
      key={item.id}
      href={item.href}
      showPending
      aria-current={current?.id === item.id ? "page" : undefined}
      aria-label={t(item.label)}
      title={t(item.label)}
      className="admin-nav-link"
      onClick={() => {
        onSelect?.();
        onNavigate?.();
      }}
    >
      <Icon name={navigationIcons[item.icon]} />
      <span className="admin-nav-text">
        <UiText text={item.label} />
      </span>
    </RouteLink>
  );
  return (
    <nav className="admin-navigation" aria-label={t("后台导航")}>
      {groups.map((group) => (
        <div className="admin-nav-group" key={group.id}>
          <span className="admin-nav-label">
            <UiText text={group.label} />
          </span>
          <div className="admin-nav-items">
            {group.entries.map((entry) => {
              if (entry.kind === "page") return link(entry.page);
              const { branch, items } = entry;
              const panelId = `${id}-${branch.id}`;
              const pinned =
                expanded === branch.id || current?.menu?.branch === branch.id;
              if (flyouts && !pinned)
                return (
                  <AdminNavigationFlyout
                    key={branch.id}
                    label={branch.label}
                    icon={<Icon name={navigationIcons[branch.icon]} />}
                    current={false}
                    onPin={() => {
                      if (collapsed) onExpand?.();
                      setExpansion({ pathname, branch: branch.id });
                      requestAnimationFrame(() =>
                        document
                          .getElementById(`${panelId}-trigger`)
                          ?.focus({ preventScroll: true }),
                      );
                    }}
                  >
                    {items.map((item) => link(item, onExpand))}
                  </AdminNavigationFlyout>
                );
              const open = !collapsed && expanded === branch.id;
              return (
                <div className="admin-nav-branch" key={branch.id}>
                  <Button
                    id={`${panelId}-trigger`}
                    className="admin-nav-link admin-nav-trigger"
                    aria-expanded={open}
                    aria-controls={panelId}
                    aria-label={t(branch.label)}
                    title={t(branch.label)}
                    data-current={items.some((item) => item.id === current?.id)}
                    onClick={() => {
                      if (collapsed) onExpand?.();
                      setExpansion({
                        pathname,
                        branch: open ? undefined : branch.id,
                      });
                    }}
                  >
                    <Icon name={navigationIcons[branch.icon]} />
                    <span className="admin-nav-text">
                      <UiText text={branch.label} />
                    </span>
                    <span className="admin-nav-chevron" aria-hidden="true">
                      <Icon name="chevron" />
                    </span>
                  </Button>
                  <div
                    id={panelId}
                    className="admin-nav-submenu"
                    data-open={open}
                    inert={!open}
                    aria-hidden={!open}
                  >
                    <div>
                      <div className="admin-nav-children">
                        {items.map((item) => link(item))}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
