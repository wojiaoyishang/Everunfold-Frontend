import type { PublicSnapshot } from "@/core/content/types";
import { normalizePath } from "@/core/content/urls";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { registeredPageLanguages } from "./registered-languages";
export function resolveManagedPage(snapshot: PublicSnapshot, path: string) {
  const target = normalizePath(path);
  const occupied = new Set(
    [...snapshot.contents, ...(snapshot.pages ?? [])].map((item) =>
      normalizePath(item.path),
    ),
  );
  return (
    snapshot.pages?.find((page) => normalizePath(page.path) === target) ??
    snapshot.pages?.find((page) =>
      registeredPageLanguages(
        page,
        normalizeCatalog(snapshot.site.settings?.site.language_catalog),
        occupied,
      ).some((item) => normalizePath(item.path) === target),
    )
  );
}
