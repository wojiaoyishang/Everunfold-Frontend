import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import "@/themes/argon/argon.css";
import { initializeMotion } from "@/core/browser/motion-policy";
import { initializeAppearance } from "@/core/browser/appearance-policy";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Everunfold" };

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" data-motion="full" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: initializeAppearance }} />
        <script dangerouslySetInnerHTML={{ __html: initializeMotion }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
