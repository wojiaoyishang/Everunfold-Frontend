import type { PublicManagedPage } from "@/generated/pages-contract";
import type { LanguageCatalog } from "@/core/i18n/catalog";
import type { Content } from "@/core/content/types";
import { localizedPageImplementations } from "./registry";
import { normalizePath } from "@/core/content/urls";

/** Locale routing is an explicit code capability; database pages cannot opt themselves in. */
export function registeredPageLanguages(
  page: PublicManagedPage,
  catalog: LanguageCatalog,
  occupied?: ReadonlySet<string>,
): NonNullable<Content["translations"]> {
  if (
    page.source !== "registered" ||
    !page.implementation_id ||
    !localizedPageImplementations.has(page.implementation_id)
  )
    return [];
  return catalog.languages
    .filter(
      (item) =>
        item.enabled &&
        (item.prefix + page.path === page.path ||
          !occupied?.has(normalizePath(item.prefix + page.path))),
    )
    .map((item) => ({
      id: `${page.id}:${item.code}`,
      language: item.code,
      access: "public",
      is_original: item.code === catalog.default_code,
      path: item.prefix + page.path,
    }));
}
