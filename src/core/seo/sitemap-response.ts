import {
  readPublicSnapshot,
  SnapshotUnavailable,
} from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { sitemapEntries } from "./discovery";
import { discoveryPageResponse } from "./discovery-page";
import { buildSitemapXml } from "./sitemap";
import { SITEMAP_PREVIEW_PATH, SITEMAP_XML_PATH } from "./sitemap-paths";

function readablePath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

async function readSitemap() {
  try {
    const snapshot = await readPublicSnapshot();
    const origin = readConfiguration().publicSiteUrl;
    return {
      site: snapshot.site,
      origin,
      entries: origin ? sitemapEntries(snapshot, origin) : [],
    };
  } catch (error) {
    if (error instanceof SnapshotUnavailable) return null;
    throw error;
  }
}

function unavailable() {
  return new Response("Sitemap temporarily unavailable", {
    status: 503,
    headers: { "Cache-Control": "no-store", "Retry-After": "60" },
  });
}

export async function sitemapXmlResponse() {
  const sitemap = await readSitemap();
  if (!sitemap) return unavailable();
  if (!sitemap.entries.length)
    return new Response("Sitemap unavailable", {
      status: 404,
      headers: { "Cache-Control": "no-store" },
    });
  return new Response(buildSitemapXml(sitemap.entries), {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/xml; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      Link: `<${SITEMAP_PREVIEW_PATH}>; rel="alternate"; type="text/html"`,
    },
  });
}

export async function sitemapPreviewResponse() {
  const sitemap = await readSitemap();
  if (!sitemap) return unavailable();
  const { site, entries, origin } = sitemap;
  return discoveryPageResponse({
    kind: "sitemap",
    siteName: site.name,
    siteDescription: site.settings?.site.seo_description || site.description,
    items: entries.map((entry) => {
      const url = new URL(entry.url);
      const href = url.pathname + url.search;
      return {
        title: href === "/" ? "站点首页" : readablePath(href),
        href,
        meta: entry.lastModified
          ? new Date(entry.lastModified).toLocaleDateString("zh-CN")
          : undefined,
        tags: entry.alternates?.languages
          ? [`${Object.keys(entry.alternates.languages).length} 种语言`]
          : undefined,
      };
    }),
    rawHref: SITEMAP_XML_PATH,
    emptyMessage: origin
      ? "站点地图当前为空，或已在站点设置中关闭。"
      : "尚未配置公开站点地址，因此不会生成正式站点地图。",
    status: entries.length ? 200 : 404,
    updatedAt: entries
      .map((entry) => entry.lastModified)
      .filter((value): value is string | Date => Boolean(value))
      .sort((a, b) => new Date(b).valueOf() - new Date(a).valueOf())[0]
      ?.toString(),
  });
}
