import type { PublicSnapshot } from "@/core/content/types";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { feedAlternates } from "./discovery";
import { resolveSeo, seoSite } from "./metadata";
import { canonicalPath, seoAlternates, seoRouteFor, seoRoutes } from "./routes";

export function managedPageSeo(
  snapshot: PublicSnapshot,
  page: PublicManagedPage,
  origin?: string,
) {
  const routes = seoRoutes(snapshot);
  const site = seoSite(snapshot.site);
  const locale = snapshot.site.locale ?? site.defaultLanguage;
  const route = seoRouteFor(routes, page.id, page.language ?? locale);
  const cover =
    typeof page.options?.cover_url === "string"
      ? page.options.cover_url
      : undefined;
  const result = resolveSeo(
    {
      ...page,
      kind: "page",
      summary: page.description,
      cover,
      path: route?.path ?? page.path,
      language: route?.language ?? page.language ?? locale,
      languages:
        route && route.language === locale
          ? seoAlternates(route, routes)
          : undefined,
      canonical: route ? canonicalPath(route, routes) : undefined,
      indexable: route?.eligible ?? false,
    },
    site,
    origin,
  );
  if (result.metadata.alternates)
    result.metadata.alternates.types = feedAlternates(snapshot.site, origin);
  return result;
}

export function defaultHomeSeo(snapshot: PublicSnapshot, origin?: string) {
  const site = seoSite(snapshot.site);
  const catalog = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  );
  const current = catalog.languages.find(
    (item) => item.code === (snapshot.site.locale ?? catalog.default_code),
  );
  const path = current?.prefix || "/";
  const routes = seoRoutes(snapshot);
  const route = routes.get(path);
  const languages = route ? seoAlternates(route, routes) : {};
  if (Object.keys(languages).length > 1 && languages[catalog.default_code])
    languages["x-default"] = languages[catalog.default_code];
  const result = resolveSeo(
    {
      kind: "page",
      title: "",
      summary: site.description,
      path,
      language: current?.code,
      languages,
      siteHome: true,
    },
    site,
    origin,
  );
  if (result.metadata.alternates)
    result.metadata.alternates.types = feedAlternates(snapshot.site, origin);
  return result;
}
