import "@/themes/argon/argon.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { readConfiguration } from "@/core/config/server";
import { BlogShell } from "@/themes/argon/components/shell";

export async function generateMetadata(): Promise<Metadata> {
  try {
    const { site } = await readPublicSnapshot();
    return {
      title: {
        default: site.name,
        template: `%s · ${site.hero_title || site.name}`,
      },
      description: site.description,
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
    <BlogShell site={site} backendBaseUrl={backendBaseUrl}>
      {children}
    </BlogShell>
  );
}
