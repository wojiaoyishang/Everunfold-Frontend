import type { Site } from "@/core/content/types";

export function discoverySettings(site: Pick<Site, "settings">) {
  return {
    sitemap_enabled: true,
    feeds_enabled: true,
    feed_limit: 30,
    feed_content: "excerpt" as const,
    structured_data: true,
    share_image: "",
    site_alternate_name: "",
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
