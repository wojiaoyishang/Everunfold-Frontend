import type { ContentPresentation } from "@/core/contracts/presentation";
import type { Site } from "@/core/content/types";
import { discoverySettings, indexable } from "./discovery";
import { resourceUrl } from "@/core/content/urls";
export function articleSchema(
  content: ContentPresentation,
  site: Site,
  origin?: string,
) {
  if (
    !origin ||
    !indexable(site, content) ||
    !discoverySettings(site).structured_data
  )
    return null;
  const url = new URL(content.path, origin).href;
  const cover = resourceUrl(
    content.cover_url || discoverySettings(site).share_image,
  );
  return {
    "@context": "https://schema.org",
    "@type": content.type === "article" ? "BlogPosting" : "CreativeWork",
    "@id": url + "#content",
    url,
    mainEntityOfPage: url,
    headline: content.seo_title || content.title,
    description: content.seo_description || content.excerpt,
    inLanguage: content.language,
    datePublished: content.published_at,
    dateModified: content.updated_at,
    author: { "@type": "Person", name: content.author },
    ...(cover ? { image: new URL(cover, origin).href } : {}),
    isPartOf: {
      "@type": "WebSite",
      name: site.name,
      url: new URL("/", origin).href,
    },
  };
}
export function StructuredData({
  data,
}: {
  data: Record<string, unknown> | null;
}) {
  return data ? (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replaceAll("<", "\\u003c"),
      }}
    />
  ) : null;
}
