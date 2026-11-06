import { resolveManagedPage } from "@/core/pages/resolve";
import { ManagedPageView } from "@/themes/argon/pages/view";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  if (managed)
    return {
      title: managed.title,
      description: managed.description || undefined,
      robots: {
        index:
          managed.allow_indexing !== false &&
          snapshot.site.settings?.site.allow_indexing !== false,
        follow: true,
      },
      alternates: readConfiguration().publicSiteUrl
        ? {
            canonical: new URL(managed.path, readConfiguration().publicSiteUrl!)
              .href,
          }
        : undefined,
    };
  const codePath = localizedCodePath(snapshot, `/${contentPath.join("/")}`);
  if (codePath) return codePageMetadata(snapshot, codePath);
  const presented = resolvePresentation(snapshot, `/${contentPath.join("/")}`);
  return presented
    ? contentMetadata(
        presented.content,
        snapshot.site.name,
        readConfiguration().publicSiteUrl,
        presented.example,
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
  if (managed) return <ManagedPageView page={managed} />;
  const codePath = localizedCodePath(snapshot, `/${contentPath.join("/")}`);
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
    return <ShuoshuoDetail snapshot={snapshot} entry={presented} />;
  const content = resolveContent(snapshot, `/${contentPath.join("/")}`);
  if (!content) notFound();
  return (
    <Article
      snapshot={snapshot}
      content={content}
      commentsPage={pageNumber(parameters.comments_page)}
    />
  );
}
