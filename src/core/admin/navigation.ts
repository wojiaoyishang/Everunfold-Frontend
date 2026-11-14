import { builtinAdminModule } from "./builtin-module";
import { createAdminRegistry } from "./registry";
import { contentAdminModule } from "@/core/content-management/registry";
import type {
  RegisteredPluginAdminMenuGroup,
  RegisteredPluginAdminPage,
} from "@/core/plugins/admin-page-types";
import { pluginAdminHref } from "@/core/plugins/admin-routes";

/** Explicit trusted imports only. Backend responses must never mutate this catalog. */
const modules = [builtinAdminModule, contentAdminModule];
export const adminRegistry = createAdminRegistry(modules);
export const adminNavigationGroups = adminRegistry.navigation;
export const adminNavigation = Object.freeze(
  adminNavigationGroups.flatMap((group) => group.items),
);
export const adminDestination = adminRegistry.resolve;

function ownedGroupId(pluginId: string, group: string) {
  return `plugins.${pluginId}.group.${group}`;
}

export function createAdminPluginRegistry(
  pages: readonly RegisteredPluginAdminPage[],
  groups: readonly RegisteredPluginAdminMenuGroup[],
) {
  if (!pages.length) return adminRegistry;
  return createAdminRegistry([
    ...modules,
    {
      id: "plugins",
      groups: groups
        .filter((group) => !group.parent)
        .map((group) => ({
          id: ownedGroupId(group.pluginId, group.id),
          label: group.label,
          order: group.order ?? 80,
        })),
      branches: groups.flatMap((group) =>
        group.parent
          ? [
              {
                id: ownedGroupId(group.pluginId, group.id),
                label: group.label,
                order: group.order ?? 80,
                group: group.parent,
                icon: group.icon ?? "extension",
              },
            ]
          : [],
      ),
      pages: pages.map((page) => {
        const group = groups.find(
          (item) =>
            item.pluginId === page.pluginId &&
            item.id === (page.menu || undefined)?.group,
        );
        const groupId = group && ownedGroupId(group.pluginId, group.id);
        return {
          id: `plugins.${page.pluginId}.page.${page.id}`,
          href: pluginAdminHref(page.pluginId, page.id),
          label: page.label,
          description: page.description ?? "",
          icon: page.icon ?? "extension",
          menu:
            page.menu === false
              ? null
              : {
                  group:
                    group?.parent ??
                    groupId ??
                    page.menu?.group ??
                    "core.settings",
                  branch: group?.parent ? groupId : undefined,
                  order: page.menu?.order ?? 80,
                },
        };
      }),
    },
  ]);
}

export type { AdminPageRegistration as AdminDestination } from "./registry";
