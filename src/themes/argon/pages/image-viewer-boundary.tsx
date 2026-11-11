"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { pluginRegistry } from "@/core/plugins/registry";
import { pageImageViewerSettings } from "@/core/pages/image-viewer";
import { ArticleMedia } from "../components/article-media";
import styles from "./pages.module.css";

const PageImageViewerContext = createContext({ enabled: true });

export function usePageImageViewer() {
  return useContext(PageImageViewerContext);
}

export function PageImageViewerBoundary({
  page,
  children,
}: {
  page: PublicManagedPage;
  children: ReactNode;
}) {
  const runtime = usePluginRuntime();
  const definitions =
    runtime.catalog?.plugins
      .filter((plugin) => !runtime.catalog?.disabled.includes(plugin.id))
      .flatMap((plugin) => plugin.pages) ?? pluginRegistry.pages;
  const declaration =
    page.source === "registered"
      ? definitions.find(
          ({ registration }) =>
            registration.id === page.implementation_id &&
            registration.version === page.implementation_version,
        )?.imageViewer
      : undefined;
  const { enabled, selector } = pageImageViewerSettings(page, declaration);
  return (
    <PageImageViewerContext.Provider value={{ enabled }}>
      <ArticleMedia
        enabled={enabled}
        selector={selector}
        className={styles.imageViewerScope}
      >
        {children}
      </ArticleMedia>
    </PageImageViewerContext.Provider>
  );
}
