import type { Locale } from "./locale";
import type { Content, PublicSnapshot } from "@/core/content/types";
import { normalizePath } from "@/core/content/urls";
import { normalizeCatalog } from "./catalog";

export function snapshotLocale(snapshot: PublicSnapshot): Locale {
  return (
    snapshot.site.locale ??
    normalizeCatalog(snapshot.site.settings?.site.language_catalog).default_code
  );
}

/** Pick one published member per group before pagination, preserving real paths. */
export function languageContents(
  contents: Content[],
  locale: Locale,
): Content[] {
  const groups = new Map<string, Content[]>();
  for (const item of contents) {
    const key = item.translation_group_id || item.id;
    const list = groups.get(key) ?? [];
    list.push(item);
    groups.set(key, list);
  }
  return [...groups.values()].map(
    (items) =>
      items.find((item) => item.language === locale) ??
      items.find((item) =>
        item.translations?.some(
          (member) => member.id === item.id && member.is_original,
        ),
      ) ??
      items[0],
  );
}
export function localizedSnapshot(
  snapshot: PublicSnapshot,
  locale: Locale,
): PublicSnapshot {
  return {
    ...snapshot,
    site: {
      ...snapshot.site,
      locale,
      contentLocales: Object.fromEntries(
        snapshot.contents.map((item) => [
          normalizePath(item.path),
          item.language,
        ]),
      ),
      contentTranslations: Object.fromEntries(
        snapshot.contents.map((item) => [
          normalizePath(item.path),
          item.translations?.length
            ? item.translations
            : [
                {
                  id: item.id,
                  path: item.path,
                  language: item.language,
                  access: item.access ?? "public",
                  is_original: true,
                },
              ],
        ]),
      ),
    },
  };
}
