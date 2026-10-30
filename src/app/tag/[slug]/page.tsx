import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber } from "@/core/content/query";
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
  const tag = snapshot.taxonomies.find(
    (term) => term.kind === "tag" && term.slug === slug,
  );
  if (!tag) notFound();
  return (
    <ArticleList
      snapshot={snapshot}
      title={`# ${tag.name}`}
      subtitle={`标签 · ${tag.count} 篇文章`}
      icon="tag"
      filter={{ tag: slug, page: pageNumber(parameters.page) }}
      pathname={`/tag/${encodeURIComponent(slug)}`}
    />
  );
}
