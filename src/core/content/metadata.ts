import type { Site } from "./types";
import {
  discoverySettings,
  feedAlternates,
  indexable,
} from "@/core/seo/discovery";
import type { Metadata } from "next";
import type { ContentPresentation } from "@/core/contracts/presentation";
import { resourceUrl } from "./urls";
export function contentMetadata(
  content: ContentPresentation,
  siteName: string,
  siteUrl?: string,
  example = false,
  site?: Site,
  indexedPaths?: ReadonlySet<string>,
): Metadata {
  const title = content.seo_title?.trim() || content.title || "一则随记";
  const description =
    content.access === "public"
      ? content.seo_description?.trim() || content.excerpt
      : "这段内容暂未开放。";
  const url =
    siteUrl && !example ? new URL(content.path, siteUrl).href : undefined;
  const cover =
    content.access === "public"
      ? resourceUrl(
          content.share_image_url ||
            content.cover_url ||
            discoverySettings(site ?? {}).share_image,
        )
      : null;
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
            types: feedAlternates(site ?? {}, siteUrl),
            ...(content.access === "public"
              ? {
                  languages: Object.fromEntries(
                    (content.translations ?? [])
                      .filter(
                        (item) =>
                          item.access === "public" &&
                          (!indexedPaths || indexedPaths.has(item.path)),
                      )
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
    ...(example || !indexable(site ?? {}, content)
      ? { robots: { index: false, follow: true } }
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
