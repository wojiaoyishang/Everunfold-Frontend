import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber } from "@/core/content/query";
import { ArticleList } from "@/themes/argon/components/article-list";
export default async function CategoryPage({
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
  const category = snapshot.taxonomies.find(
    (term) => term.kind === "category" && term.slug === slug,
  );
  if (!category) notFound();
  return (
    <ArticleList
      snapshot={snapshot}
      title={category.name}
      subtitle={`分类 · ${category.count} 篇文章`}
      icon="folder"
      filter={{ category: slug, page: pageNumber(parameters.page) }}
      pathname={`/category/${encodeURIComponent(slug)}`}
    />
  );
}
