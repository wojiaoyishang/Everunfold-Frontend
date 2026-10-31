import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/themes/argon/argon.css";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { BlogShell } from "@/themes/argon/components/shell";
import { initializeMotion } from "@/core/browser/motion-policy";
import { initializeAppearance } from "@/core/browser/appearance-policy";
import { readConfiguration } from "@/core/config/server";

export const dynamic = "force-dynamic";

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

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const { site } = await readPublicSnapshot();
  const { backendBaseUrl } = readConfiguration();
  return (
    <html lang="zh-CN" data-motion="full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initializeAppearance }} />
        <script dangerouslySetInnerHTML={{ __html: initializeMotion }} />
      </head>
      <body>
        <BlogShell site={site} backendBaseUrl={backendBaseUrl}>
          {children}
        </BlogShell>
      </body>
    </html>
  );
}
