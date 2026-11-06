import type { Metadata } from "next";
import type { ContentPresentation } from "@/core/contracts/presentation";
import { resourceUrl } from "./urls";
export function contentMetadata(
  content: ContentPresentation,
  siteName: string,
  siteUrl?: string,
  example = false,
): Metadata {
  const title = content.seo_title?.trim() || content.title || "一则随记";
  const description =
    content.access === "public"
      ? content.seo_description?.trim() || content.excerpt
      : "这段内容暂未开放。";
  const url =
    siteUrl && !example ? new URL(content.path, siteUrl).href : undefined;
  const cover =
    content.access === "public" ? resourceUrl(content.cover_url) : null;
  const image =
    cover && (siteUrl || cover.startsWith("http"))
      ? new URL(cover, siteUrl).href
      : undefined;
  return {
    title,
    description,
    ...(siteUrl ? { metadataBase: new URL(siteUrl) } : {}),
    ...(url
      ? {
          alternates: {
            canonical: url,
            ...(content.access === "public"
              ? {
                  languages: Object.fromEntries(
                    (content.translations ?? [])
                      .filter((item) => item.access === "public")
                      .map((item) => [
                        item.language,
                        new URL(item.path, siteUrl).href,
                      ]),
                  ),
                }
              : {}),
          },
        }
      : {}),
    ...(example || content.access !== "public"
      ? { robots: { index: false } }
      : {}),
    openGraph: {
      title,
      description,
      siteName,
      type: content.type === "page" ? "website" : "article",
      ...(url ? { url } : {}),
      ...(image ? { images: [{ url: image, alt: title }] } : {}),
      ...(content.type !== "page"
        ? {
            publishedTime: content.published_at,
            modifiedTime: content.updated_at,
            authors: [content.author],
          }
        : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}
