import type { Site } from "@/core/content/types";

export const SITEMAP_XML_PATH = "/sitemap.xml";
export const SITEMAP_PREVIEW_PATH = "/sitemap.xml/preview";

export function sitemapEnabled(site: Pick<Site, "settings">) {
  return (
    site.settings?.site.allow_indexing !== false &&
    site.settings?.site.discovery?.sitemap_enabled !== false
  );
}
