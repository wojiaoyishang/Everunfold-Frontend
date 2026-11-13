import type { PublicSnapshot, Site } from "@/core/content/types";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { normalizePath } from "@/core/content/urls";
import { glossaryTermPath } from "@/core/glossary/routes";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { hasPageImplementation } from "@/core/pages/registry";
import { readingPage } from "@/core/pages/reading-pages";
import { indexable } from "./policy";

export type SeoRoute = {
  path: string;
  sourcePath?: string;
  language: string;
  id: string;
  group?: string;
  canonical?: string;
  updatedAt?: string;
  eligible: boolean;
};

export type SeoRoutes = ReadonlyMap<string, SeoRoute>;

export function seoRoutes(snapshot: PublicSnapshot): SeoRoutes {
  const { site } = snapshot;
  const catalog = normalizeCatalog(site.settings?.site.language_catalog);
  const active = catalog.languages.filter((language) => language.enabled);
  const enabledLanguages = new Set(active.map((language) => language.code));
  const result = new Map<string, SeoRoute>();
  const add = (route: SeoRoute) => {
    const key = normalizePath(route.path);
    if (!result.has(key)) result.set(key, route);
  };
  const publishedPages = (snapshot.pages ?? []).filter(
    (page) => page.enabled && hasPageImplementation(page),
  );
  for (const item of snapshot.contents)
    add({
      id: item.id,
      path: item.path,
      language: item.language,
      canonical: item.seo_canonical_path,
      group: item.translation_group_id
        ? `content:${item.translation_group_id}`
        : undefined,
      eligible: enabledLanguages.has(item.language) && indexable(site, item),
      updatedAt: item.updated_at,
    });
  const homes = new Map<string, string>();
  for (const language of active) {
    const path = language.prefix || "/";
    const home = readingPage(snapshot, "home_page_id", language.code);
    if (home?.language === language.code) homes.set(home.id, path);
    else if (!home)
      add({
        id: path,
        path,
        language: language.code,
        group: "home",
        eligible: indexable(site),
      });
  }
  for (const page of publishedPages) {
    const language = page.language ?? catalog.default_code;
    const homePath = homes.get(page.id);
    add(
      pageSeoRoute(
        site,
        page,
        homePath ?? page.path,
        language,
        enabledLanguages,
      ),
    );
  }
  if (
    !site.settings?.extensions?.disabled_plugins?.includes(
      "everunfold.glossary",
    )
  ) {
    for (const term of snapshot.glossary ?? []) {
      const path = glossaryTermPath(term, catalog);
      if (path)
        add({
          id: term.id,
          path,
          language:
            term.language === "*" ? catalog.default_code : term.language,
          canonical: term.seo_canonical_path,
          eligible: indexable(site, term),
          updatedAt: term.updated_at,
        });
    }
  }
  return result;
}

function pageSeoRoute(
  site: Site,
  page: PublicManagedPage,
  path: string,
  language: string,
  enabledLanguages: ReadonlySet<string>,
): SeoRoute {
  return {
    id: page.id,
    path,
    sourcePath: page.path,
    language,
    group:
      page.source !== "registered" && page.translation_group_id
        ? `pages:${page.translation_group_id}`
        : undefined,
    canonical: page.seo_canonical_path,
    eligible: enabledLanguages.has(language) && indexable(site, page),
  };
}

export function seoRouteFor(routes: SeoRoutes, id: string, language: string) {
  const matching = [...routes.values()].filter((route) => route.id === id);
  return matching.find((route) => route.language === language) ?? matching[0];
}

/** A canonical target must be a real, eligible, same-language primary page. */
export function canonicalPath(route: SeoRoute, routes: SeoRoutes): string {
  if (!route.eligible || !route.canonical) return route.path;
  const target = routes.get(normalizePath(route.canonical));
  if (!target?.eligible || target.language !== route.language)
    return route.path;
  if (
    target.canonical &&
    normalizePath(target.canonical) !== normalizePath(target.path)
  )
    return route.path;
  return target.path;
}

export function seoAlternates(route: SeoRoute, routes: SeoRoutes) {
  if (
    !route.eligible ||
    !route.group ||
    canonicalPath(route, routes) !== route.path
  )
    return {};
  return Object.fromEntries(
    [...routes.values()]
      .filter(
        (other) =>
          other.eligible &&
          other.group === route.group &&
          canonicalPath(other, routes) === other.path,
      )
      .map((other) => [other.language, other.path]),
  );
}
