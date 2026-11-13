import type { Metadata } from "next";
import type { Site } from "@/core/content/types";
import type { EditorSettings } from "@/core/contracts/content-admin";
import { resourceUrl } from "@/core/content/urls";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { discoverySettings, indexable } from "./policy";

export type SeoFields = Pick<
  EditorSettings,
  | "allow_indexing"
  | "seo_title"
  | "seo_description"
  | "share_image_media_id"
  | "seo_canonical_path"
  | "seo_share_title"
  | "seo_share_description"
  | "seo_image_alt"
  | "seo_max_snippet"
  | "seo_image_preview"
  | "seo_structured_data"
>;

export function seoSite(site: Pick<Site, "name" | "description" | "settings">) {
  const discovery = discoverySettings(site);
  return {
    name: site.name,
    description:
      site.settings?.site.seo_description?.trim() || site.description,
    titleTemplate: site.settings?.site.title_template ?? "%s · %site%",
    indexable: indexable(site),
    shareImage: discovery.share_image,
    structured: discovery.structured_data,
    alternateName: discovery.site_alternate_name,
    defaultLanguage: normalizeCatalog(site.settings?.site.language_catalog)
      .default_code,
  };
}

export type SeoSite = ReturnType<typeof seoSite>;
export type SeoKind = "article" | "shuoshuo" | "page" | "glossary";
export type SeoInput = Omit<SeoFields, "share_image_media_id"> & {
  kind: SeoKind;
  title: string;
  summary?: string;
  path?: string;
  canonical?: string;
  language?: string | null;
  languages?: Record<string, string>;
  access?: string;
  indexable?: boolean;
  share_image_url?: string | null;
  cover?: string | null;
  author?: string;
  publishedAt?: string;
  updatedAt?: string;
  aliases?: string[];
  siteHome?: boolean;
};

export const seoTypes: Record<SeoKind, string> = {
  article: "BlogPosting",
  shuoshuo: "SocialMediaPosting",
  page: "WebPage",
  glossary: "DefinedTerm",
};

function absolute(value: string | undefined, origin?: string) {
  if (!value) return undefined;
  const resource = resourceUrl(value);
  if (!resource || (!origin && resource.startsWith("/"))) return undefined;
  return new URL(resource, origin).href;
}

function socialLocale(language?: string | null) {
  if (!language) return undefined;
  try {
    const { language: primary, region } = new Intl.Locale(language).maximize();
    return region ? `${primary}_${region}` : undefined;
  } catch {
    return undefined;
  }
}

export function resolveSeo(input: SeoInput, site: SeoSite, origin?: string) {
  const readable = !input.access || input.access === "public";
  const title =
    (readable && input.seo_title?.trim()) ||
    input.title.trim() ||
    (input.kind === "shuoshuo" ? "一则随记" : site.name);
  const formattedTitle =
    input.siteHome && !input.title
      ? site.name
      : site.titleTemplate
          .replaceAll("%site%", () => site.name)
          .replaceAll("%s", () => title);
  const description = readable
    ? input.seo_description?.trim() || input.summary?.trim() || undefined
    : "这段内容暂未开放。";
  const canIndex =
    site.indexable &&
    readable &&
    input.allow_indexing !== false &&
    input.indexable !== false;
  const canonical = absolute(input.canonical || input.path, origin);
  const shareTitle = (readable && input.seo_share_title?.trim()) || title;
  const shareDescription =
    (readable && input.seo_share_description?.trim()) || description;
  const image = readable
    ? (absolute(input.share_image_url ?? undefined, origin) ??
      absolute(input.cover ?? undefined, origin) ??
      absolute(site.shareImage, origin))
    : undefined;
  const imageAlt = image ? input.seo_image_alt?.trim() || title : undefined;
  const representativeImage =
    absolute(input.cover ?? undefined, origin) ??
    absolute(input.share_image_url ?? undefined, origin);
  const article = input.kind === "article" || input.kind === "shuoshuo";
  const languages =
    canIndex && canonical === absolute(input.path, origin)
      ? (input.languages ?? {})
      : {};
  const robots: NonNullable<Metadata["robots"]> = {
    index: canIndex,
    follow: true,
    ...(canIndex && input.seo_max_snippet != null
      ? { "max-snippet": input.seo_max_snippet }
      : {}),
    ...(canIndex && input.seo_image_preview
      ? { "max-image-preview": input.seo_image_preview }
      : {}),
  };
  const structured =
    canIndex &&
    site.structured &&
    input.seo_structured_data !== false &&
    canonical &&
    canonical === absolute(input.path, origin)
      ? {
          "@context": "https://schema.org",
          "@type": seoTypes[input.kind],
          "@id": canonical + "#content",
          url: canonical,
          ...(article
            ? {
                headline: input.title.trim() || title,
                mainEntityOfPage: canonical,
              }
            : { name: input.title.trim() || title }),
          ...(description ? { description } : {}),
          ...(input.kind !== "glossary" && input.language
            ? { inLanguage: input.language }
            : {}),
          ...(input.kind === "glossary" && input.aliases?.length
            ? { alternateName: input.aliases }
            : {}),
          ...(article && input.publishedAt
            ? { datePublished: input.publishedAt }
            : {}),
          ...(article && input.updatedAt
            ? { dateModified: input.updatedAt }
            : {}),
          ...(article && input.author
            ? { author: { "@type": "Person", name: input.author } }
            : {}),
          ...(representativeImage ? { image: representativeImage } : {}),
        }
      : null;
  const alternatives = Object.fromEntries(
    Object.entries(languages).flatMap(([language, path]) => {
      const url = absolute(path, origin);
      return url ? [[language, url]] : [];
    }),
  );
  const locale = socialLocale(input.language);
  const alternateLocales = Object.keys(languages)
    .filter(
      (language) => language !== input.language && language !== "x-default",
    )
    .flatMap((language) => socialLocale(language) ?? []);
  const metadata: Metadata = {
    title: { absolute: formattedTitle },
    description,
    robots,
    ...(article && readable && input.author
      ? { authors: [{ name: input.author }] }
      : {}),
    ...(canonical
      ? {
          alternates: {
            canonical,
            ...(Object.keys(alternatives).length
              ? { languages: alternatives }
              : {}),
          },
        }
      : {}),
    openGraph: {
      title: shareTitle,
      description: shareDescription,
      siteName: site.name,
      type: article ? "article" : "website",
      url: canonical,
      locale,
      alternateLocale: alternateLocales,
      ...(image ? { images: [{ url: image, alt: imageAlt }] } : {}),
      ...(article && readable
        ? {
            publishedTime: input.publishedAt,
            modifiedTime: input.updatedAt,
          }
        : {}),
    },
    twitter: image
      ? {
          card: "summary_large_image",
          title: shareTitle,
          description: shareDescription,
          images: [{ url: image, alt: imageAlt }],
        }
      : { card: "summary", title: shareTitle, description: shareDescription },
  };
  return {
    metadata,
    structured,
    formattedTitle,
    description,
    shareTitle,
    shareDescription,
    image,
    imageAlt,
    canonical,
    canIndex,
  };
}

export function siteIdentity(site: SeoSite, origin?: string) {
  if (!origin || !site.indexable || !site.structured) return null;
  const url = new URL("/", origin).href;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": url + "#website",
    name: site.name,
    url,
    ...(site.alternateName?.trim()
      ? { alternateName: site.alternateName.trim() }
      : {}),
  };
}
