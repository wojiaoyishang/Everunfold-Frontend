import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { discoverySettings, feedItems, indexable } from "./discovery";
import { buildFeed } from "./feeds";
import {
  browserDiscoveryRequested,
  discoveryPageResponse,
} from "./discovery-page";
export async function feedResponse(request: Request, format: "rss" | "atom") {
  const origin = readConfiguration().publicSiteUrl;
  const snapshot = await readPublicSnapshot();
  const language =
    new URL(request.url).searchParams.get("language") || undefined;
  const enabled = normalizeCatalog(
    snapshot.site.settings?.site.language_catalog,
  ).languages;
  const headers = {
    "Cache-Control": "no-store",
    Vary: "Accept, Sec-Fetch-Dest, User-Agent",
    "X-Robots-Tag": "noindex",
    "X-Content-Type-Options": "nosniff",
  };
  if (
    !origin ||
    !indexable(snapshot.site) ||
    !discoverySettings(snapshot.site).feeds_enabled ||
    (language &&
      !enabled.some((item) => item.enabled && item.code === language))
  ) {
    if (browserDiscoveryRequested(request))
      return discoveryPageResponse({
        kind: format,
        siteName: snapshot.site.name,
        siteDescription: snapshot.site.description,
        items: [],
        rawHref: `/${format === "rss" ? "feed" : "atom"}.xml?format=xml`,
        emptyMessage: "此订阅当前未启用，或所选语言不可用。",
        status: 404,
      });
    return new Response("Feed unavailable", { status: 404, headers });
  }
  if (browserDiscoveryRequested(request)) {
    const entries = feedItems(snapshot, language);
    return discoveryPageResponse({
      kind: format,
      siteName: snapshot.site.name,
      siteDescription:
        snapshot.site.settings?.site.seo_description ||
        snapshot.site.description,
      items: entries.map((item) => ({
        title: item.title,
        href: item.path,
        meta: new Date(item.published_at).toLocaleDateString("zh-CN"),
        summary: item.excerpt,
        tags: item.categories.map((term) => term.name),
      })),
      rawHref: `/${format === "rss" ? "feed" : "atom"}.xml?format=xml${
        language ? `&language=${encodeURIComponent(language)}` : ""
      }`,
      emptyMessage: "当前没有可订阅的公开内容。",
      language,
      updatedAt: entries[0]?.updated_at,
    });
  }
  return new Response(buildFeed(snapshot, origin, format, language), {
    headers: {
      ...headers,
      "Content-Type":
        format === "rss"
          ? "application/rss+xml; charset=utf-8"
          : "application/atom+xml; charset=utf-8",
    },
  });
}
