import type { MetadataRoute } from "next";
import type { Content, PublicSnapshot, Site } from "@/core/content/types";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { pageLanguages } from "@/core/pages/languages";
import { registeredPageLanguages } from "@/core/pages/registered-languages";
import { hasPageImplementation } from "@/core/pages/registry";
import { SITEMAP_XML_PATH, sitemapEnabled } from "./sitemap-paths";

export function discoverySettings(site: Pick<Site, "settings">) {
  return {
    sitemap_enabled: true,
    feeds_enabled: true,
    feed_limit: 30,
    structured_data: true,
    share_image: "",
    google_verification: "",
    bing_verification: "",
    ...site.settings?.site.discovery,
  };
}
export function indexable(
  site: Pick<Site, "settings">,
  item?: { access?: string; allow_indexing?: boolean },
) {
  return (
    site.settings?.site.allow_indexing !== false &&
    item?.allow_indexing !== false &&
    (!item?.access || item.access === "public")
  );
}

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
  const homes = catalog.languages
    .filter((language) => language.enabled)
    .map((language) => ({
      language: language.code,
      path: language.prefix || "/",
    }));
  const languages = (items: { language: string; path: string }[]) =>
    Object.fromEntries(
      items.map((item) => [item.language, absolute(item.path)]),
    );
  const result: MetadataRoute.Sitemap = homes.map((item) => ({
    url: absolute(item.path),
    alternates: { languages: languages(homes) },
  }));
  const contents = snapshot.contents.filter((item) => indexable(site, item));
  const paths = new Set(contents.map((item) => item.path));
  for (const item of contents)
    result.push({
      url: absolute(item.path),
      lastModified: item.updated_at,
      alternates: {
        languages: languages(
          (item.translations ?? []).filter(
            (member) => paths.has(member.path) && member.access === "public",
          ),
        ),
      },
    });
  const pages = (snapshot.pages ?? []).filter(
    (page) =>
      indexable(site, page) && page.enabled && hasPageImplementation(page),
  );
  const allowedPages = new Set(pages.map((page) => page.id));
  const occupied = new Set(
    [...snapshot.contents, ...(snapshot.pages ?? [])].map((item) => item.path),
  );
  for (const page of pages) {
    const variants =
      page.source === "custom"
        ? pageLanguages(snapshot, page).filter((item) =>
            allowedPages.has(item.id),
          )
        : registeredPageLanguages(page, catalog, occupied);
    const urls = new Set([page.path, ...variants.map((item) => item.path)]);
    for (const path of urls)
      result.push({
        url: absolute(path),
        ...(variants.length
          ? { alternates: { languages: languages(variants) } }
          : {}),
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
