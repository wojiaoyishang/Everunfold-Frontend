import {
  discoverySettings,
  feedAlternates,
  indexable,
} from "@/core/seo/discovery";
import { resourceUrl } from "@/core/content/urls";
import { articleSchema, StructuredData } from "@/core/seo/structured-data";
import { resolveManagedPage } from "@/core/pages/resolve";
import { ManagedPageView } from "@/themes/argon/pages/view";
import { pageLanguages } from "@/core/pages/languages";
import { registeredPageLanguages } from "@/core/pages/registered-languages";
import { normalizeCatalog } from "@/core/i18n/catalog";
import { PagePresentation } from "@/themes/argon/components/route-state";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { readPageSnapshot as readPublicSnapshot } from "@/core/i18n/server";
import { pageNumber, resolveContent } from "@/core/content/query";
import { Article } from "@/themes/argon/components/article";
import { resolvePresentation } from "@/core/content/presentation";
import { ShuoshuoDetail } from "@/themes/argon/components/shuoshuo";
import { contentMetadata } from "@/core/content/metadata";
import { readConfiguration } from "@/core/config/server";
import { ProtectedArticle } from "@/themes/argon/components/protected-article";
import { localizedCodePath } from "@/core/i18n/routes";
import { CodePage, codePageMetadata } from "../code-page";
import { readActiveTheme } from "@/core/themes/server";
import { GlossaryDirectory } from "@/themes/argon/glossary/directory";
import { GlossaryDetailPage } from "@/themes/argon/glossary/detail";
import { translate } from "@/core/i18n/messages";
import { messageLocale } from "@/core/i18n/locale";
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
  if (managed) {
    const variants =
      managed.source === "custom"
        ? pageLanguages(snapshot, managed)
        : registeredPageLanguages(
            managed,
            normalizeCatalog(snapshot.site.settings?.site.language_catalog),
            new Set(
              [...snapshot.contents, ...(snapshot.pages ?? [])].map(
                (item) => item.path,
              ),
            ),
          );
    const canonical =
      managed.source === "registered"
        ? (variants.find((item) => item.language === snapshot.site.locale)
            ?.path ?? managed.path)
        : managed.path;
    const origin = readConfiguration().publicSiteUrl;
    const image = resourceUrl(discoverySettings(snapshot.site).share_image);
    const url = origin ? new URL(canonical, origin).href : undefined;
    const description = managed.description || undefined;
    const images = image && origin ? [new URL(image, origin).href] : undefined;
    return {
      title: managed.title,
      description,
      openGraph: {
        title: managed.title,
        description,
        type: "website",
        siteName: snapshot.site.name,
        url,
        images,
      },
      twitter: {
        card: images ? "summary_large_image" : "summary",
        title: managed.title,
        description,
        images,
      },
      robots: {
        index:
          managed.access !== "captcha" &&
          managed.allow_indexing !== false &&
          snapshot.site.settings?.site.allow_indexing !== false,
        follow: true,
      },
      alternates: origin
        ? {
            canonical: url,
            types: feedAlternates(snapshot.site, origin),
            languages: Object.fromEntries(
              variants
                .filter((item) =>
                  managed.source === "registered"
                    ? indexable(snapshot.site, managed)
                    : snapshot.pages?.some(
                        (page) =>
                          page.id === item.id && indexable(snapshot.site, page),
                      ),
                )
                .map((item) => [
                  item.language,
                  new URL(item.path, origin).href,
                ]),
            ),
          }
        : undefined,
    };
  }
  const codePath = localizedCodePath(snapshot, `/${contentPath.join("/")}`);
  if (codePath?.startsWith("/glossary")) {
    const request = await headers();
    return {
      title: translate(
        "术语表",
        messageLocale(request.get("x-everunfold-ui-locale")),
      ),
      robots: { index: true, follow: true },
    };
  }
  if (codePath) return codePageMetadata(snapshot, codePath);
  const presented = resolvePresentation(snapshot, `/${contentPath.join("/")}`);
  return presented
    ? contentMetadata(
        presented.content,
        snapshot.site.name,
        readConfiguration().publicSiteUrl,
        presented.example,
        snapshot.site,
        new Set(
          snapshot.contents
            .filter((item) => indexable(snapshot.site, item))
            .map((item) => item.path),
        ),
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
  if (managed)
    return (
      <>
        <PagePresentation
          site={snapshot.site}
          id={`page:${managed.id}:${managed.revision}`}
        />
        <ManagedPageView
          page={managed}
          translations={pageLanguages(snapshot, managed)}
          comments={snapshot.comments[managed.id] ?? []}
        />
      </>
    );
  const codePath = localizedCodePath(snapshot, `/${contentPath.join("/")}`);
  if (codePath === "/glossary") return <GlossaryDirectory />;
  if (codePath?.startsWith("/glossary/"))
    return (
      <GlossaryDetailPage
        slug={decodeURIComponent(codePath.slice("/glossary/".length))}
      />
    );
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
        key={`${protectedContent.id}:${protectedContent.updated_at}`}
        content={protectedContent}
        site={snapshot.site}
        baseUrl={readConfiguration().backendBaseUrl}
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
