import type { MetadataRoute } from "next";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { robotsRules } from "@/core/seo/discovery";
export const dynamic = "force-dynamic";
export default async function robots(): Promise<MetadataRoute.Robots> {
  return robotsRules(
    (await readPublicSnapshot()).site,
    readConfiguration().publicSiteUrl,
  );
}
