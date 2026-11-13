"use client";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { ExtensionPlaceholder } from "@/themes/argon/components/extension-placeholder";
import type { PublicManagedPage } from "@/core/contracts/pages";
import { pluginRegistry } from "@/core/plugins/registry";
import { ExtensionComponent } from "@/core/extensions/components";
import {
  RegisteredPageLocale,
  useRegisteredPageLocale,
} from "@/core/i18n/provider";
import { useRouteState } from "@/themes/argon/components/route-state";
import { pageNumber } from "@/core/content/query";
import {
  pageArticleCategory,
  pageArticleCollection,
  type PageArticleCollection,
  type PageArticleData,
} from "./articles";
import { pageImplementation } from "./registry";

export interface CustomPageProps {
  page: PublicManagedPage;
  articleCollection?: PageArticleCollection;
  pathname?: string;
  preview?: boolean;
}

export function useRegisteredPageImplementation(page: PublicManagedPage) {
  const runtime = usePluginRuntime();
  const definitions =
    runtime.catalog?.plugins
      .filter((p) => !runtime.catalog?.disabled.includes(p.id))
      .flatMap((p) => p.pages) ?? pluginRegistry.pages;
  return {
    entry: pageImplementation(page, definitions),
    loading: runtime.loading,
  };
}

export function RegisteredPageView({
  page,
  onReady,
  articleData,
  preview,
}: Pick<CustomPageProps, "page" | "preview"> & {
  onReady?: () => void;
  articleData?: PageArticleData;
}) {
  const { entry, loading } = useRegisteredPageImplementation(page);
  const { route } = useRouteState();
  const { locale } = useRegisteredPageLocale();
  if (!entry)
    return (
      <ExtensionPlaceholder
        name={page.implementation_id ?? "page"}
        loading={loading}
      />
    );
  const [pathname, query] = route.split("?");
  const collection = entry.articleCollection;
  const articles =
    articleData?.collection ??
    (collection && articleData?.sources
      ? pageArticleCollection(
          articleData.sources,
          pageArticleCategory(page, collection.categoryOption),
          locale,
          preview
            ? 1
            : pageNumber(new URLSearchParams(query).get("page") ?? undefined),
          collection.pageSize,
        )
      : undefined);
  return (
    <RegisteredPageLocale>
      <div lang={locale}>
        <ExtensionComponent
          name={entry.component}
          page={page}
          articleCollection={articles}
          pathname={preview ? page.path : pathname}
          preview={preview}
          onReady={onReady}
        />
      </div>
    </RegisteredPageLocale>
  );
}
