import { notFound } from "next/navigation";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber, resolveTaxonomy } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
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
  const category = resolveTaxonomy(snapshot, "category", slug);
  if (!category) notFound();
  return (
    <ArticleList
      snapshot={snapshot}
      title={category.name}
      subtitle={`分类 · ${category.count} 篇文章`}
      icon="folder"
      filter={{ category: category.slug, page: pageNumber(parameters.page) }}
      pathname={taxonomyHref(category)}
    />
  );
}
