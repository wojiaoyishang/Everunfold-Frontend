import { pluginAdminRoute } from "@/core/plugins/admin-routes";

/** Trusted page metadata. A registry entry never grants permission. */
export type AdminPageIcon =
  | "comment"
  | "discussion"
  | "lock"
  | "users"
  | "book"
  | "glossary"
  | "font"
  | "leaf"
  | "overview"
  | "content"
  | "media"
  | "extension"
  | "settings"
  | "theme"
  | "icons"
  | "shortcode"
  | "writing"
  | "applications"
  | "navigation"
  | "languages"
  | "taxonomy"
  | "mail"
  | "notification"
  | "notification-platform"
  | "notification-template"
  | "notification-delivery"
  | "node-settings"
  | "runtime"
  | "page"
  | "system";
export interface AdminMenuGroup {
  readonly id: string;
  readonly label: string;
  readonly order: number;
}
/** A disclosure heading, not a destination or an authorization boundary. */
export interface AdminMenuBranch extends AdminMenuGroup {
  readonly group: string;
  readonly icon: AdminPageIcon;
}
export interface AdminPageRegistration {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly description: string;
  readonly icon: AdminPageIcon;
  /** Explicit trusted child routes; arbitrary descendants are never accepted. */
  readonly matchesChild?: (pathname: string) => boolean;
  /** Detail pages can be registered without appearing in the sidebar. */
  readonly menu: {
    readonly group: string;
    readonly order: number;
    readonly branch?: string;
  } | null;
}
export interface AdminModuleRegistration {
  readonly id: string;
  readonly groups?: readonly AdminMenuGroup[];
  readonly branches?: readonly AdminMenuBranch[];
  readonly pages: readonly AdminPageRegistration[];
}
export interface AdminNavigationGroup extends AdminMenuGroup {
  readonly items: readonly AdminPageRegistration[];
  readonly branches: readonly AdminMenuBranch[];
}
export type AdminNavigationEntry =
  | { kind: "page"; page: AdminPageRegistration }
  | {
      kind: "branch";
      branch: AdminMenuBranch;
      items: readonly AdminPageRegistration[];
    };

/** Filter destinations before grouping, so an empty or unauthorized branch disappears. */
export function adminMenuEntries(
  group: AdminNavigationGroup,
  visible: (page: AdminPageRegistration) => boolean,
): AdminNavigationEntry[] {
  const items = group.items.filter(visible);
  const entries: AdminNavigationEntry[] = items
    .filter((page) => !page.menu?.branch)
    .map((page) => ({ kind: "page", page }));
  for (const branch of group.branches) {
    const children = items.filter((page) => page.menu?.branch === branch.id);
    if (children.length)
      entries.push({ kind: "branch", branch, items: children });
  }
  const order = (entry: AdminNavigationEntry) =>
    entry.kind === "branch"
      ? entry.branch
      : { id: entry.page.id, order: entry.page.menu!.order };
  return entries.sort((a, b) => byOrder(order(a), order(b)));
}

const byOrder = (
  a: { order: number; id: string },
  b: { order: number; id: string },
) => a.order - b.order || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
const routePattern = /^\/admin(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*$/;

/** Pure assembly, shared by server route guards and browser navigation. No global mutation. */
export function createAdminRegistry(
  modules: readonly AdminModuleRegistration[],
) {
  const moduleIds = new Set<string>();
  const groupMap = new Map<string, AdminMenuGroup>();
  const branchMap = new Map<string, AdminMenuBranch>();
  const pageMap = new Map<string, AdminPageRegistration>();
  const routeMap = new Map<string, AdminPageRegistration>();
  for (const registration of modules) {
    if (
      !/^[a-z][a-z0-9-]*$/.test(registration.id) ||
      moduleIds.has(registration.id)
    )
      throw new Error(`Invalid or duplicate admin module: ${registration.id}`);
    moduleIds.add(registration.id);
    const validateId = (id: string) => {
      if (
        !id.startsWith(`${registration.id}.`) ||
        !/^[a-z0-9-]+\.[a-z][a-z0-9.-]*$/.test(id)
      )
        throw new Error(
          `Admin entry must use module namespace ${registration.id}: ${id}`,
        );
    };
    for (const group of registration.groups ?? []) {
      validateId(group.id);
      if (
        groupMap.has(group.id) ||
        !group.label.trim() ||
        !Number.isSafeInteger(group.order)
      )
        throw new Error(`Invalid or duplicate admin group: ${group.id}`);
      groupMap.set(group.id, Object.freeze({ ...group }));
    }
    for (const branch of registration.branches ?? []) {
      validateId(branch.id);
      if (
        branchMap.has(branch.id) ||
        !branch.label.trim() ||
        !Number.isSafeInteger(branch.order)
      )
        throw new Error(`Invalid or duplicate admin branch: ${branch.id}`);
      branchMap.set(branch.id, Object.freeze({ ...branch }));
    }
    for (const page of registration.pages) {
      validateId(page.id);
      if (pageMap.has(page.id) || routeMap.has(page.href))
        throw new Error(
          `Duplicate admin page or route: ${page.id} (${page.href})`,
        );
      if (
        (!routePattern.test(page.href) && !pluginAdminRoute(page.href)) ||
        !page.label.trim()
      )
        throw new Error(`Invalid admin destination: ${page.id} (${page.href})`);
      if (page.menu && !Number.isSafeInteger(page.menu.order))
        throw new Error(`Invalid admin menu order: ${page.id}`);
      const entry = Object.freeze({
        ...page,
        menu: page.menu ? Object.freeze({ ...page.menu }) : null,
      });
      pageMap.set(page.id, entry);
      routeMap.set(page.href, entry);
    }
  }
  const pages = Object.freeze([...pageMap.values()]);
  for (const branch of branchMap.values()) {
    if (!groupMap.has(branch.group))
      throw new Error(`Unknown admin branch group: ${branch.group}`);
  }
  for (const page of pages) {
    if (page.menu && !groupMap.has(page.menu.group))
      throw new Error(`Unknown admin menu group: ${page.menu.group}`);
    if (
      page.menu?.branch &&
      branchMap.get(page.menu.branch)?.group !== page.menu.group
    )
      throw new Error(`Unknown or misplaced admin branch: ${page.menu.branch}`);
  }
  const navigation: readonly AdminNavigationGroup[] = Object.freeze(
    [...groupMap.values()]
      .sort(byOrder)
      .map((group) =>
        Object.freeze({
          ...group,
          branches: Object.freeze(
            [...branchMap.values()]
              .filter((branch) => branch.group === group.id)
              .sort(byOrder),
          ),
          items: Object.freeze(
            pages
              .filter((page) => page.menu?.group === group.id)
              .sort((a, b) =>
                byOrder(
                  { id: a.id, order: a.menu!.order },
                  { id: b.id, order: b.menu!.order },
                ),
              ),
          ),
        }),
      )
      .filter((group) => group.items.length > 0),
  );
  return Object.freeze({
    pages,
    navigation,
    page: (id: string): AdminPageRegistration | undefined => pageMap.get(id),
    resolve: (pathname: string): AdminPageRegistration | undefined =>
      routeMap.get(pathname.replace(/\/$/, "")) ??
      pages.find((page) => page.matchesChild?.(pathname.replace(/\/$/, ""))),
  });
}
