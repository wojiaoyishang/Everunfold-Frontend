import type { ContentPresentation } from "@/core/contracts/presentation";
import type { Site } from "@/core/content/types";
import { contentSeo } from "@/core/content/metadata";
import type { SeoRoutes } from "./routes";

export function articleSchema(
  content: ContentPresentation,
  site: Site,
  origin?: string,
  routes?: SeoRoutes,
) {
  return contentSeo(content, site, origin, false, routes).structured;
}

export function serializeStructuredData(data: Record<string, unknown>) {
  return JSON.stringify(data).replaceAll("<", "\\u003c");
}

export function StructuredData({
  data,
}: {
  data: Record<string, unknown> | null;
}) {
  return data ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeStructuredData(data) }}
    />
  ) : null;
}
