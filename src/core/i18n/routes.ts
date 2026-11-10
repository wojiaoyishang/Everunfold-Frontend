import type { PublicSnapshot } from "@/core/content/types";
import { resolveContent } from "@/core/content/query";
import { hasPublicRoute, publicCodePaths } from "@/core/content/routes";
import { normalizePath } from "@/core/content/urls";
import { normalizeCatalog } from "./catalog";
import { unprefixedPath } from "./locale";

/** Route prefixed code pages directly; CMS addresses always resolve by their own identity. */
export function localizedCodePath(
  snapshot: PublicSnapshot,
  path: string,
): string | null {
  if (resolveContent(snapshot, path)) return null;
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const prefix = catalog.languages.find(
    (item) =>
      item.enabled &&
      item.prefix &&
      (path === item.prefix || path.startsWith(item.prefix + "/")),
  );
  if (!prefix) return null;
  const base = normalizePath(unprefixedPath(path, catalog));
  return (publicCodePaths.has(base) ||
    /^\/(?:category|tag)\//.test(base) ||
    /^\/glossary\/[^/]+$/.test(base)) &&
    hasPublicRoute(snapshot, base)
    ? base
    : null;
}
