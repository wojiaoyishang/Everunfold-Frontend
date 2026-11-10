import type { PublicSnapshot } from "@/core/content/types";
import { queryContents, type ContentFilter } from "@/core/content/query";
import { contentMetadata } from "@/core/content/client-data";
import { PagePresentation } from "./route-state";
import { PostCard } from "./post-card";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { SiteNotice } from "./site-notice";
import { Icon, type IconName } from "./icon";

export function ArticleList({
  snapshot,
  title,
  subtitle,
  filter,
  pathname = "/",
  icon = "book",
  home = false,
}: {
  snapshot: PublicSnapshot;
  title?: string;
  subtitle?: string;
  filter?: ContentFilter;
  pathname?: string;
  icon?: IconName;
  home?: boolean;
}) {
  const result = queryContents(snapshot, filter);
  return (
    <>
      <PagePresentation site={snapshot.site} />
      {home && (
        <SiteNotice
          title={snapshot.site.settings?.site.notice_title}
          content={snapshot.site.notice ?? ""}
        />
      )}
      {title && (
        <header className="surface page-heading">
          <Icon name={icon} />
          <div>
            <h1>{title}</h1>
            <p>{subtitle ?? `共 ${result.total} 篇文章`}</p>
          </div>
        </header>
      )}
      <div className="article-list">
        {result.items.length ? (
          result.items.map((content) => (
            <PostCard key={content.id} content={contentMetadata(content)} />
          ))
        ) : (
          <EmptyState
            title={filter?.query ? "没有找到相关故事" : "这里还没有文章"}
            description={
              filter?.query
                ? "试试另一个关键词，或从文章归档中寻找。"
                : undefined
            }
          />
        )}
      </div>
      <Pagination
        page={result.page}
        pages={result.pages}
        pathname={pathname}
        query={filter?.query}
      />
    </>
  );
}
