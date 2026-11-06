import type { PublicSnapshot } from "@/core/content/types";
import { normalizePath } from "@/core/content/urls";
export function resolveManagedPage(snapshot: PublicSnapshot, path: string) {
  const target = normalizePath(path);
  return snapshot.pages?.find((page) => normalizePath(page.path) === target);
}
