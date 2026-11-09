import type { MetadataRoute } from "next";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { sitemapEntries } from "@/core/seo/discovery";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = readConfiguration().publicSiteUrl;
  return origin ? sitemapEntries(await readPublicSnapshot(), origin) : [];
}
