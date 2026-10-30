import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/themes/argon/argon.css";
import { readPublicSnapshot } from "@/core/content/snapshot";

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

const initializeTheme = `(function(){try{var t=localStorage.getItem('everunfold.theme');if(t==='dark'||t==='light'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initializeTheme }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
