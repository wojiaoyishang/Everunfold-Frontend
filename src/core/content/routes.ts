import type { PublicSnapshot } from "./types";
import { resolveContent } from "./query";
import { normalizePath } from "./urls";
import { examplePaths } from "./examples";

export const publicCodePaths = new Set([
  "/",
  "/search",
  "/archives",
  "/categories",
  "/tags",
  "/ss",
  "/article",
]);

/** Resolve before streaming so a genuinely missing page retains its HTTP 404. */
export function hasPublicRoute(
  snapshot: PublicSnapshot,
  requestedPath: string,
): boolean {
  const path = normalizePath(requestedPath);
  if (publicCodePaths.has(path) || examplePaths.has(path)) return true;
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
