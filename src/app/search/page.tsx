import type { Metadata } from "next";
import { readPublicSnapshot } from "@/core/content/snapshot";
import { pageNumber, queryContents } from "@/core/content/query";
import { BlogShell } from "@/themes/argon/components/shell";
import { PostCard } from "@/themes/argon/components/post-card";
import { Pagination } from "@/themes/argon/components/pagination";
import { EmptyState } from "@/themes/argon/components/empty-state";
import { Icon } from "@/themes/argon/components/icon";
export const metadata: Metadata = {
  title: "站内搜索",
  robots: { index: false, follow: true },
};
export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [snapshot, parameters] = await Promise.all([
    readPublicSnapshot(),
    searchParams,
  ]);
  const query =
    typeof parameters.q === "string" ? parameters.q.trim().slice(0, 160) : "";
  const result = queryContents(snapshot, {
    query,
    page: pageNumber(parameters.page),
  });
  return (
    <BlogShell site={snapshot.site}>
      <section className="surface search-card">
        <h1>
          <Icon name="search" />
          站内搜索
        </h1>
        <form action="/search" method="get" className="search-form">
          <input
            name="q"
            aria-label="搜索关键词"
            placeholder="搜索文章、分类或标签…"
            defaultValue={query}
            maxLength={160}
            autoFocus
          />
          <button className="primary-button" type="submit">
            搜索
          </button>
        </form>
        <p>
          {query
            ? `“${query}” 找到 ${result.total} 篇文章`
            : "在这里，寻找某一段故事。"}
        </p>
      </section>
      {query && (
        <>
          <div className="article-list">
            {result.items.length ? (
              result.items.map((item) => (
                <PostCard key={item.id} content={item} />
              ))
            ) : (
              <EmptyState
                title="没有找到相关故事"
                description="试试另一个关键词，或从文章归档中寻找。"
              />
            )}
          </div>
          <Pagination
            page={result.page}
            pages={result.pages}
            pathname="/search"
            query={query}
          />
        </>
      )}
    </BlogShell>
  );
}
