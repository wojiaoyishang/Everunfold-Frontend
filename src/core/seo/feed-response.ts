import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { discoverySettings, indexable } from "./discovery";
import { buildFeed } from "./feeds";
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
    "X-Robots-Tag": "noindex",
    "X-Content-Type-Options": "nosniff",
  };
  if (
    !origin ||
    !indexable(snapshot.site) ||
    !discoverySettings(snapshot.site).feeds_enabled ||
    (language &&
      !enabled.some((item) => item.enabled && item.code === language))
  )
    return new Response("Feed unavailable", { status: 404, headers });
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
