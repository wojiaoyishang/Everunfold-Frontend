import "server-only";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { readPageConfiguration } from "@/core/config/server";
import type { AdminSeo } from "@/core/admin/seo-context";
import { seoSite } from "@/core/seo/metadata";
import { seoRoutes } from "@/core/seo/routes";

export async function readAdminSeo(): Promise<AdminSeo> {
  const origin = readPageConfiguration().publicSiteUrl;
  const snapshot = await readPublicSnapshot().catch(() => null);
  const site = snapshot?.site ?? { name: "Everunfold", description: "" };
  return {
    site: seoSite(site),
    origin,
    routes: snapshot ? [...seoRoutes(snapshot).values()] : [],
  };
}
