import type { MetadataRoute } from "next";
import type { Content, PublicSnapshot, Site } from "@/core/content/types";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { archiveRoute } from "@/core/content/archive";
import { localizeHref } from "@/core/i18n/locale";
import { normalizePath } from "@/core/content/urls";
import { SITEMAP_XML_PATH, sitemapEnabled } from "./sitemap-paths";

import { discoverySettings, indexable } from "./policy";
import { canonicalPath, seoAlternates, seoRoutes } from "./routes";

export { discoverySettings, indexable } from "./policy";

export function discoveryXmlUrl(path: string, origin: string) {
  const url = new URL(path, origin);
  url.searchParams.set("format", "xml");
  return url.href;
}
/** Each route's alternates replace the layout's object, so include feed discovery there too. */
export function feedAlternates(site: Pick<Site, "settings">, origin?: string) {
  if (!origin || !indexable(site) || !discoverySettings(site).feeds_enabled)
    return undefined;
  return {
    "application/rss+xml": discoveryXmlUrl("/feed.xml", origin),
    "application/atom+xml": discoveryXmlUrl("/atom.xml", origin),
  };
}
export function sitemapEntries(
  snapshot: PublicSnapshot,
  origin: string,
): MetadataRoute.Sitemap {
  const { site } = snapshot;
  if (!sitemapEnabled(site)) return [];
  const catalog = normalizeCatalog(site.settings?.site.language_catalog);
  const absolute = (path: string) => new URL(path, origin).href;
  const routes = seoRoutes(snapshot);
  const result: MetadataRoute.Sitemap = [...routes.values()]
    .filter(
      (item) => item.eligible && canonicalPath(item, routes) === item.path,
    )
    .map((item) => {
      const alternates = Object.entries(seoAlternates(item, routes));
      if (item.group === "home" && alternates.length > 1) {
        const fallback = alternates.find(
          ([locale]) => locale === catalog.default_code,
        );
        if (fallback) alternates.push(["x-default", fallback[1]]);
      }
      return {
        url: absolute(item.path),
        lastModified: item.updatedAt,
        ...(alternates.length
          ? {
              alternates: {
                languages: Object.fromEntries(
                  alternates.map(([language, path]) => [
                    language,
                    absolute(path),
                  ]),
                ),
              },
            }
          : {}),
      };
    });
  const articles = snapshot.contents.filter(
    (item) => item.kind === "article" && indexable(site, item),
  );
  const codePages = [
    ...(articles.length ? [archiveRoute(snapshot)] : []),
    ...(![...snapshot.contents, ...(snapshot.pages ?? [])].some(
      (item) => normalizePath(item.path) === "/about",
    )
      ? ["/about"]
      : []),
  ];
  for (const path of codePages) {
    const variants = catalog.languages
      .filter((language) => language.enabled)
      .map((language) => ({
        language: language.code,
        path: localizeHref(path, language.code, catalog),
      }));
    for (const variant of variants)
      result.push({
        url: absolute(variant.path),
        alternates: {
          languages: Object.fromEntries(
            variants.map((item) => [item.language, absolute(item.path)]),
          ),
        },
      });
  }
  return [...new Map(result.map((item) => [item.url, item])).values()];
}
export function feedItems(
  snapshot: PublicSnapshot,
  language?: string,
): Content[] {
  if (
    !discoverySettings(snapshot.site).feeds_enabled ||
    !indexable(snapshot.site)
  )
    return [];
  return snapshot.contents
    .filter(
      (item) =>
        item.kind !== "page" &&
        indexable(snapshot.site, item) &&
        (!language || item.language === language),
    )
    .sort(
      (a, b) =>
        Date.parse(b.published_at) - Date.parse(a.published_at) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, discoverySettings(snapshot.site).feed_limit);
}
export function robotsRules(site: Site, origin?: string): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/account",
        "/login",
        "/api/",
        "/v1/",
        "/internal/",
        "/reference/",
      ],
    },
    ...(origin && sitemapEnabled(site)
      ? { sitemap: new URL(SITEMAP_XML_PATH, origin).href }
      : {}),
  };
}
