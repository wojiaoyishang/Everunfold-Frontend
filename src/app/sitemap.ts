import type { MetadataRoute } from "next";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { pageLanguages } from "@/core/pages/languages";
import { registeredPageLanguages } from "@/core/pages/registered-languages";
import { normalizeCatalog } from "@/core/i18n/catalog";

export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const site = readConfiguration().publicSiteUrl;
  if (!site) return [];
  const snapshot = await readPublicSnapshot();
  if (snapshot.site.settings?.site.allow_indexing === false) return [];
  const content = snapshot.contents
    .filter((item) => (item.access ?? "public") === "public")
    .map((item) => ({
      url: new URL(item.path, site).href,
      lastModified: item.updated_at,
      alternates: {
        languages: Object.fromEntries(
          (item.translations ?? [])
            .filter((member) => member.access === "public")
            .map((member) => [
              member.language,
              new URL(member.path, site).href,
            ]),
        ),
      },
    }));
  return [
    ...content,
    ...(snapshot.pages ?? [])
      .filter((page) => page.allow_indexing !== false)
      .map((page) => ({
        url: new URL(page.path, site).href,
        alternates: {
          languages: Object.fromEntries(
            [
              ...pageLanguages(snapshot, page),
              ...registeredPageLanguages(
                page,
                normalizeCatalog(snapshot.site.settings?.site.language_catalog),
                new Set(
                  [...snapshot.contents, ...(snapshot.pages ?? [])].map(
                    (item) => item.path,
                  ),
                ),
              ),
            ].map((member) => [
              member.language,
              new URL(member.path, site).href,
            ]),
          ),
        },
      })),
  ];
}
