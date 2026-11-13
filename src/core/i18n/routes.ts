import type { PublicSnapshot } from "@/core/content/types";
import { resolveContent } from "@/core/content/query";
import { resolveManagedPage } from "@/core/pages/resolve";
import { hasPublicRoute, publicCodePaths } from "@/core/content/routes";
import { normalizePath } from "@/core/content/urls";
import { normalizeCatalog } from "./catalog";
import { unprefixedPath } from "./locale";

/** Resolve localized code routes and the About fallback after checking published addresses. */
export function localizedCodePath(
  snapshot: PublicSnapshot,
  path: string,
): string | null {
  if (resolveContent(snapshot, path) || resolveManagedPage(snapshot, path))
    return null;
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const prefix = catalog.languages.find(
    (item) =>
      item.enabled &&
      item.prefix &&
      (path === item.prefix || path.startsWith(item.prefix + "/")),
  );
  const base = normalizePath(prefix ? unprefixedPath(path, catalog) : path);
  if (!prefix) return base === "/about" ? base : null;
  if (
    base === "/about" &&
    (resolveContent(snapshot, base) || resolveManagedPage(snapshot, base))
  )
    return null;
  return (publicCodePaths.has(base) ||
    /^\/(?:category|tag)\//.test(base) ||
    /^\/glossary\/[^/]+$/.test(base)) &&
    hasPublicRoute(snapshot, base)
    ? base
    : null;
}
