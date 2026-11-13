import type { Metadata } from "next";
import type { ContentPresentation } from "@/core/contracts/presentation";
import type { Site } from "./types";
import { feedAlternates } from "@/core/seo/discovery";
import { resolveSeo, seoSite } from "@/core/seo/metadata";
import {
  canonicalPath,
  seoAlternates,
  seoRouteFor,
  type SeoRoutes,
} from "@/core/seo/routes";

export function contentSeo(
  content: ContentPresentation,
  site: Pick<Site, "name" | "description" | "settings">,
  origin?: string,
  example = false,
  routes?: SeoRoutes,
) {
  const route = routes && seoRouteFor(routes, content.id, content.language);
  return resolveSeo(
    {
      ...content,
      kind: content.type,
      summary: content.excerpt,
      cover: content.cover_url,
      path: example ? undefined : content.path,
      canonical:
        route && routes && !example ? canonicalPath(route, routes) : undefined,
      languages:
        route && routes
          ? seoAlternates(route, routes)
          : !routes && !example && content.allow_indexing !== false
            ? Object.fromEntries(
                (content.translations ?? [])
                  .filter((item) => item.access === "public")
                  .map((item) => [item.language, item.path]),
              )
            : undefined,
      indexable: !example && (route?.eligible ?? true),
      publishedAt: content.published_at,
      updatedAt: content.updated_at,
    },
    seoSite(site),
    origin,
  );
}

export function contentMetadata(
  content: ContentPresentation,
  siteName: string,
  origin?: string,
  example = false,
  site?: Site,
  routes?: SeoRoutes,
): Metadata {
  const { metadata } = contentSeo(
    content,
    site ?? { name: siteName, description: "" },
    origin,
    example,
    routes,
  );
  if (
    !site &&
    typeof metadata.title === "object" &&
    metadata.title &&
    "absolute" in metadata.title
  )
    metadata.title = content.seo_title?.trim() || content.title;
  if (metadata.alternates)
    metadata.alternates.types = feedAlternates(site ?? {}, origin);
  return metadata;
}
