import type { Locale } from "./locale";
import type { Content, PublicSnapshot } from "@/core/content/types";
import { normalizePath } from "@/core/content/urls";
import { normalizeCatalog } from "./catalog";
import { pageLanguages } from "@/core/pages/languages";
import { registeredPageLanguages } from "@/core/pages/registered-languages";

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
  const pages = (snapshot.pages ?? []).filter(
    (page) => page.source === "custom" && page.language,
  );
  const resources: Record<string, string> = {};
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const occupied = new Set(
    [...snapshot.contents, ...(snapshot.pages ?? [])].map((item) =>
      normalizePath(item.path),
    ),
  );
  const registered = (snapshot.pages ?? []).flatMap((page) => {
    const variants = registeredPageLanguages(page, catalog, occupied);
    return variants.length
      ? [page.path, ...variants.map((item) => item.path)].map((path) => ({
          path,
          variants,
        }))
      : [];
  });
  for (const item of snapshot.contents) {
    resources[`${item.kind}:${item.id}`] =
      item.translations?.find((member) => member.language === locale)?.path ??
      item.path;
  }
  for (const page of snapshot.pages ?? []) {
    resources[`page:${page.id}`] =
      [
        ...pageLanguages(snapshot, page),
        ...registeredPageLanguages(page, catalog, occupied),
      ].find((member) => member.language === locale)?.path ?? page.path;
  }
  return {
    ...snapshot,
    site: {
      ...snapshot.site,
      locale,
      navigationResources: resources,
      contentLocales: Object.fromEntries(
        [...snapshot.contents, ...pages]
          .map((item) => [normalizePath(item.path), item.language!])
          .concat(
            registered.map((item) => [
              normalizePath(item.path),
              item.variants.find((member) => member.path === item.path)
                ?.language ?? catalog.default_code,
            ]),
          ),
      ),
      contentTranslations: Object.fromEntries([
        ...snapshot.contents.map((item) => [
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
        ...pages.map((page) => [
          normalizePath(page.path),
          pageLanguages(snapshot, page),
        ]),
        ...registered.map((item) => [normalizePath(item.path), item.variants]),
      ]),
    },
  };
}
