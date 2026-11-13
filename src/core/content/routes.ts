import type { PublicSnapshot } from "./types";
import { resolveContent } from "./query";
import { resolveManagedPage } from "@/core/pages/resolve";
import { hasPageImplementation } from "@/core/pages/registry";
import { normalizePath } from "./urls";

export const publicCodePaths = new Set([
  "/",
  "/search",
  "/archives",
  "/categories",
  "/tags",
  "/ss",
  "/article",
  "/about",
  "/glossary",
]);

/** Resolve before streaming so a genuinely missing page retains its HTTP 404. */
export function hasPublicRoute(
  snapshot: PublicSnapshot,
  requestedPath: string,
): boolean {
  const path = normalizePath(requestedPath);
  const managed = resolveManagedPage(snapshot, path);
  if (managed) {
    if (!hasPageImplementation(managed))
      throw new Error("Unavailable registered page implementation");
    return true;
  }
  if (publicCodePaths.has(path)) return true;
  if (/^\/glossary\/[^/]+$/.test(path)) return true;
  const taxonomy = /^\/(category|tag)\/([^/]+)$/.exec(
    requestedPath.replace(/\/$/, ""),
  );
  if (taxonomy) {
    let slug: string;
    try {
      slug = decodeURIComponent(taxonomy[2]);
    } catch {
      return false;
    }
    return snapshot.taxonomies.some(
      (term) => term.kind === taxonomy[1] && term.slug === slug,
    );
  }
  return resolveContent(snapshot, path) !== undefined;
}
