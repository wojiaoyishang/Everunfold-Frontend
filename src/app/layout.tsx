import { PluginRuntimeProvider } from "@/core/plugins/runtime/provider";
import { readRuntimeCatalog } from "@/server/plugins/current";
import type { RuntimeCatalog } from "@/core/plugins/runtime/types";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { LocaleProvider } from "@/core/i18n/provider";
import { localeOf, messageLocale } from "@/core/i18n/locale";
import { readPageSnapshot } from "@/core/i18n/server";
import { normalizeCatalog } from "@/core/i18n/catalog";

import "./globals.css";
import "@/themes/argon/shared.css";
import { initializeMotion } from "@/core/browser/motion-policy";
import { initializeAppearance } from "@/core/browser/appearance-policy";
import { ToastProvider } from "@/themes/argon/components/ui/toast/toast-provider";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Everunfold" };

export default async function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const request = await headers();
  const locale = localeOf(request.get("x-everunfold-locale"));
  const privateUI = request.get("x-everunfold-management") === "true";
  const uiLocale = messageLocale(request.get("x-everunfold-ui-locale"));
  // Keep the settings repair surface reachable if the applied local revision is corrupt.
  const runtime = await readRuntimeCatalog().catch((error): RuntimeCatalog => {
    if (!privateUI) throw error;
    return {
      protocol: "plugin-catalog-1",
      revision: "repair",
      theme: "argon",
      disabled: [],
      plugins: [],
      errors: [],
      development: process.env.NODE_ENV !== "production",
    };
  });
  const catalog = privateUI
    ? undefined
    : normalizeCatalog(
        (await readPageSnapshot()).site.settings?.site.language_catalog,
      );
  return (
    <html
      lang={locale}
      data-ui-locale={uiLocale}
      data-motion="full"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: initializeAppearance }} />
        <script dangerouslySetInnerHTML={{ __html: initializeMotion }} />
      </head>
      <body>
        <LocaleProvider
          initial={locale}
          initialUI={uiLocale}
          catalog={catalog}
          privateUI={privateUI}
        >
          <PluginRuntimeProvider initial={runtime}>
            <ToastProvider>{children}</ToastProvider>
          </PluginRuntimeProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
