import type { AuthUser } from "@/core/contracts/auth";

export function canAccessAdmin(user: AuthUser | null | undefined): boolean {
  return (
    !!user &&
    !user.must_change_password &&
    (user.role === "admin" || Object.keys(user.permissions ?? {}).length > 0)
  );
}

export function can(
  user: AuthUser,
  capability: string,
  ownerId?: string | null,
): boolean {
  if (capability === "unregistered") return false;
  if (user.must_change_password) return false;
  const scope = user.role === "admin" ? "all" : user.permissions?.[capability];
  return (
    scope === "all" ||
    (scope === "own" && (ownerId === undefined || ownerId === user.id))
  );
}

export function adminRoutePermission(path: string): string | null {
  if (path === "/admin") return null;
  if (path.startsWith("/admin/users")) return "users:manage";
  if (path.startsWith("/admin/settings/api-keys")) return "applications:manage";
  if (path.startsWith("/admin/settings")) return "settings:read";
  if (/^\/admin\/(?:media|icons|fonts)(?:\/|$)/.test(path)) return "media:read";
  if (path.startsWith("/admin/shortcodes")) return "shortcodes:read";
  if (path.startsWith("/admin/pages")) return "pages:read";
  if (path.startsWith("/admin/content")) return "content:read";
  return "unregistered";
}
