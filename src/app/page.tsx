import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber } from "@/core/content/query";
import { ArticleList } from "@/themes/argon/components/article-list";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const parameters = await searchParams;
  const snapshot = await readPublicSnapshot();
  const query =
    typeof parameters.q === "string"
      ? parameters.q
      : typeof parameters.s === "string"
        ? parameters.s
        : undefined;
  return (
    <ArticleList
      snapshot={snapshot}
      home={!query}
      title={query ? `搜索：${query}` : undefined}
      filter={{ page: pageNumber(parameters.page), query }}
    />
  );
}
