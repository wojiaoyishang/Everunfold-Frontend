import { discoverySettings, feedAlternates } from "@/core/seo/discovery";
import { resourceUrl } from "@/core/content/urls";
import "@/themes/argon/argon.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { readConfiguration } from "@/core/config/server";
import { PublicTheme } from "@/core/themes/presentation";
import { readActiveTheme } from "@/core/themes/server";
import { BlogShell } from "@/themes/argon/components/shell";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { site } = await readPublicSnapshot();
    const seo = discoverySettings(site);
    const origin = readConfiguration().publicSiteUrl;
    const image = resourceUrl(seo.share_image);
    return {
      ...(origin ? { metadataBase: new URL(origin) } : {}),
      verification: {
        google: seo.google_verification || undefined,
        other: seo.bing_verification
          ? { "msvalidate.01": seo.bing_verification }
          : {},
      },
      alternates: { types: feedAlternates(site, origin) },
      openGraph: {
        title: site.name,
        description: site.settings?.site.seo_description || site.description,
        siteName: site.name,
        type: "website",
        ...(image && origin
          ? { images: [{ url: new URL(image, origin).href }] }
          : {}),
      },
      title: {
        default: site.name,
        template: (
          site.settings?.site.title_template ?? "%s · %site%"
        ).replaceAll("%site%", site.name),
      },
      description: site.settings?.site.seo_description || site.description,
      robots:
        site.settings?.site.allow_indexing === false
          ? { index: false, follow: true }
          : undefined,
    };
  } catch {
    return {
      title: "内容暂时不可用 · Everunfold",
      robots: { index: false, follow: false },
    };
  }
}

/** Public snapshots belong to the reading shell, never to the management entry. */
export default async function BlogLayout({
  children,
}: {
  children: ReactNode;
}) {
  const { site } = await readPublicSnapshot();
  const { backendBaseUrl } = readConfiguration();
  return (
    <PublicTheme theme={await readActiveTheme()}>
      <BlogShell site={site} backendBaseUrl={backendBaseUrl}>
        {children}
      </BlogShell>
    </PublicTheme>
  );
}
