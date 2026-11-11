import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { sitemapEntries } from "./discovery";
import {
  browserDiscoveryRequested,
  discoveryPageResponse,
} from "./discovery-page";
import { buildSitemapXml } from "./sitemap";

function displayPath(value: string) {
  const url = new URL(value);
  return `${url.pathname}${url.search}`;
}

function readablePath(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function sitemapResponse(request: Request) {
  const origin = readConfiguration().publicSiteUrl;
  const snapshot = await readPublicSnapshot();
  const entries = origin ? sitemapEntries(snapshot, origin) : [];
  const headers = {
    "Cache-Control": "no-store",
    Vary: "Accept, Sec-Fetch-Dest, User-Agent",
    "X-Content-Type-Options": "nosniff",
  };
  if (browserDiscoveryRequested(request)) {
    return discoveryPageResponse({
      kind: "sitemap",
      siteName: snapshot.site.name,
      siteDescription:
        snapshot.site.settings?.site.seo_description ||
        snapshot.site.description,
      items: entries.map((entry) => ({
        title:
          displayPath(entry.url) === "/"
            ? "站点首页"
            : readablePath(displayPath(entry.url)),
        href: displayPath(entry.url),
        meta: entry.lastModified
          ? new Date(entry.lastModified).toLocaleDateString("zh-CN")
          : undefined,
        tags: entry.alternates?.languages
          ? [`${Object.keys(entry.alternates.languages).length} 种语言`]
          : undefined,
      })),
      rawHref: "/sitemap.xml?format=xml",
      emptyMessage: origin
        ? "站点地图当前为空，或已在站点设置中关闭。"
        : "尚未配置公开站点地址，因此不会生成正式站点地图。",
      updatedAt: entries
        .map((entry) => entry.lastModified)
        .filter((value): value is string | Date => Boolean(value))
        .sort((a, b) => new Date(b).valueOf() - new Date(a).valueOf())[0]
        ?.toString(),
    });
  }
  return new Response(buildSitemapXml(entries), {
    headers: {
      ...headers,
      "Content-Type": "application/xml; charset=utf-8",
    },
  });
}
