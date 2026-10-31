import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber, resolveTaxonomy } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { ArticleList } from "@/themes/argon/components/article-list";
export default async function TagPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [snapshot, { slug }, parameters] = await Promise.all([
    readPublicSnapshot(),
    params,
    searchParams,
  ]);
  const tag = resolveTaxonomy(snapshot, "tag", slug);
  if (!tag) notFound();
  return (
    <ArticleList
      snapshot={snapshot}
      title={`# ${tag.name}`}
      subtitle={`标签 · ${tag.count} 篇文章`}
      icon="tag"
      filter={{ tag: tag.slug, page: pageNumber(parameters.page) }}
      pathname={taxonomyHref(tag)}
    />
  );
}
