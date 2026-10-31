import type { PublicSnapshot } from "@/core/content/types";
import { queryFeed, type FeedType } from "@/core/content/presentation";
import { PagePresentation } from "./route-state";
import { SearchForm } from "./navigation-link";
import { ContentCard } from "./feed";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { Icon } from "./icon";

export function SearchResults({
  snapshot,
  query,
  type,
  page,
}: {
  snapshot: PublicSnapshot;
  query: string;
  type: FeedType;
  page: number;
}) {
  const result = queryFeed(snapshot, { query, type, page, includePages: true });
  return (
    <>
      <PagePresentation site={snapshot.site} />
      <section className="surface search-card">
        <h1>
          <Icon name="search" />
          站内搜索
        </h1>
        <SearchForm className="search-form">
          <input
            name="q"
            aria-label="搜索关键词"
            placeholder="寻找文章、说说或页面…"
            defaultValue={query}
            maxLength={160}
            autoFocus
          />
          <select name="type" aria-label="搜索内容类型" defaultValue={type}>
            <option value="all">全部内容</option>
            <option value="article">文章</option>
            <option value="shuoshuo">说说</option>
            <option value="page">页面</option>
          </select>
          <button className="primary-button" type="submit">
            搜索
          </button>
        </SearchForm>
        <p>
          {query
            ? `“${query}” 找到 ${result.total} 条内容`
            : "在这里，寻找某一段故事。"}
        </p>
      </section>
      {query && (
        <>
          <div className="article-list">
            {result.items.length ? (
              result.items.map((entry) => (
                <ContentCard key={entry.content.id} entry={entry} />
              ))
            ) : (
              <EmptyState
                title="没有找到相关内容"
                description="试试其他关键词或内容类型。"
              />
            )}
          </div>
          <Pagination
            page={result.page}
            pages={result.pages}
            pathname="/search"
            query={query}
            type={type}
          />
        </>
      )}
    </>
  );
}
