import { articleSchema, StructuredData } from "@/core/seo/structured-data";
import { seoRoutes } from "@/core/seo/routes";
import { managedPageSeo } from "@/core/seo/page";
import { readingPage } from "@/core/pages/reading-pages";
import { normalizePath } from "@/core/content/urls";
import { glossarySlug } from "@/core/glossary/routes";
import { resolveManagedPage } from "@/core/pages/resolve";
import { ManagedPageView } from "@/themes/argon/pages/view";
import { pageLanguages } from "@/core/pages/languages";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { pageImplementation } from "@/core/pages/registry";
import { pageArticleCategory, pageArticleSources } from "@/core/pages/articles";
import { PagePresentation } from "@/themes/argon/components/route-state";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { pageNumber, resolveContent } from "@/core/content/query";
import { RelatedArticles } from "@/themes/argon/components/related-articles";
import { themeProfile } from "@/core/settings/theme-options";
import { Article } from "@/themes/argon/components/article";
import { resolvePresentation } from "@/core/content/presentation";
import { ShuoshuoDetail } from "@/themes/argon/components/shuoshuo";
import { contentMetadata } from "@/core/content/metadata";
import {
  readBrowserBackendBaseUrl,
  readConfiguration,
} from "@/core/config/server";
import { ProtectedArticle } from "@/themes/argon/components/protected-article";
import { localizedCodePath } from "@/core/i18n/routes";
import { CodePage, codePageMetadata } from "../code-page";
import { readActiveTheme } from "@/core/themes/server";
import { GlossaryDirectory } from "@/themes/argon/glossary/directory";
import { GlossaryTerm, glossaryTermMetadata } from "../glossary/term";
type Parameters = {
  params: Promise<{ contentPath: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({
  params,
}: Parameters): Promise<Metadata> {
  const snapshot = await readPublicSnapshot();
  const { contentPath } = await params;
  const managed = resolveManagedPage(snapshot, `/${contentPath.join("/")}`);
  const origin = readConfiguration().publicSiteUrl;
  if (managed) return managedPageSeo(snapshot, managed, origin).metadata;
  const codePath = localizedCodePath(snapshot, `/${contentPath.join("/")}`);
  if (codePath === "/glossary") return codePageMetadata(snapshot, codePath);
  const term = glossarySlug(
    `/${contentPath.join("/")}`,
    normalizeCatalog(snapshot.site.settings?.site.language_catalog),
  );
  if (term) return glossaryTermMetadata(snapshot, term);
  if (codePath) return codePageMetadata(snapshot, codePath);
  const presented = resolvePresentation(snapshot, `/${contentPath.join("/")}`);
  return presented
    ? contentMetadata(
        presented.content,
        snapshot.site.name,
        readConfiguration().publicSiteUrl,
        presented.example,
        snapshot.site,
        seoRoutes(snapshot),
      )
    : { title: "404 页面未找到", robots: { index: false } };
}
export default async function ContentPage({
  params,
  searchParams,
}: Parameters) {
  const [snapshot, { contentPath }, parameters] = await Promise.all([
    readPublicSnapshot(),
    params,
    searchParams,
  ]);
  const managed = resolveManagedPage(snapshot, `/${contentPath.join("/")}`);
  if (
    managed &&
    normalizePath(managed.path) ===
      normalizePath(
        readingPage(snapshot, "posts_page_id", managed.language ?? undefined)
          ?.path ?? "/",
      )
  )
    return (
      <CodePage snapshot={snapshot} path="/article" parameters={parameters} />
    );
  if (managed) {
    const collection = pageImplementation(managed)?.articleCollection;
    const category =
      collection && pageArticleCategory(managed, collection.categoryOption);
    const articleData =
      collection &&
      (managed.access === "captcha"
        ? { sources: pageArticleSources(snapshot) }
        : { sources: category ? pageArticleSources(snapshot, category) : [] });
    return (
      <>
        <StructuredData
          data={
            managedPageSeo(snapshot, managed, readConfiguration().publicSiteUrl)
              .structured
          }
        />
        <PagePresentation
          site={snapshot.site}
          id={`page:${managed.id}:${managed.revision}`}
        />
        <ManagedPageView
          page={managed}
          translations={pageLanguages(snapshot, managed)}
          comments={snapshot.comments[managed.id] ?? []}
          articleData={articleData}
        />
      </>
    );
  }
  const codePath = localizedCodePath(snapshot, `/${contentPath.join("/")}`);
  if (codePath === "/glossary") return <GlossaryDirectory />;
  const term = glossarySlug(
    `/${contentPath.join("/")}`,
    normalizeCatalog(snapshot.site.settings?.site.language_catalog),
  );
  if (term) return <GlossaryTerm snapshot={snapshot} slug={term} />;
  if (codePath)
    return (
      <CodePage snapshot={snapshot} path={codePath} parameters={parameters} />
    );
  const presented = resolvePresentation(snapshot, `/${contentPath.join("/")}`);
  const protectedContent = resolveContent(
    snapshot,
    `/${contentPath.join("/")}`,
  );
  if (
    protectedContent &&
    protectedContent.access &&
    protectedContent.access !== "public"
  )
    return (
      <ProtectedArticle
        recommendations={
          protectedContent.kind === "article" && (
            <RelatedArticles
              snapshot={snapshot}
              content={protectedContent}
              limit={
                themeProfile(snapshot.site.settings)?.article.related_count
              }
              basis={
                themeProfile(snapshot.site.settings)?.article.related_basis
              }
            />
          )
        }
        key={`${protectedContent.id}:${protectedContent.updated_at}`}
        content={protectedContent}
        site={snapshot.site}
        baseUrl={await readBrowserBackendBaseUrl()}
      />
    );
  if (presented?.content.type === "shuoshuo")
    return (
      <>
        <StructuredData
          data={articleSchema(
            presented.content,
            snapshot.site,
            readConfiguration().publicSiteUrl,
            seoRoutes(snapshot),
          )}
        />
        <ShuoshuoDetail
          theme={await readActiveTheme()}
          snapshot={snapshot}
          entry={presented}
        />
      </>
    );
  const content = resolveContent(snapshot, `/${contentPath.join("/")}`);
  if (!content) notFound();
  return (
    <>
      {presented && (
        <StructuredData
          data={articleSchema(
            presented.content,
            snapshot.site,
            readConfiguration().publicSiteUrl,
            seoRoutes(snapshot),
          )}
        />
      )}
      <Article
        theme={await readActiveTheme()}
        snapshot={snapshot}
        content={content}
        commentsPage={pageNumber(parameters.comments_page)}
      />
    </>
  );
}
