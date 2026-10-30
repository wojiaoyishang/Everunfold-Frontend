import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber, resolveContent } from "@/core/content/query";
import { Article } from "@/themes/argon/components/article";
type Parameters = {
  params: Promise<{ contentPath: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({
  params,
}: Parameters): Promise<Metadata> {
  const snapshot = await readPublicSnapshot();
  const { contentPath } = await params;
  const content = resolveContent(snapshot, `/${contentPath.join("/")}`);
  return content
    ? { title: content.title, description: content.excerpt }
    : { title: "没有找到这个故事", robots: { index: false } };
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
