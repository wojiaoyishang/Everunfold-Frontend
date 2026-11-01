import type { PublicSnapshot } from "@/core/content/types";
import {
  queryFeed,
  type FeedEntry,
  type FeedType,
} from "@/core/content/presentation";
import { PostCard } from "./post-card";
import { ShuoshuoCard } from "./shuoshuo";
import { PagePresentation } from "./route-state";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { SiteNotice } from "./site-notice";
import { Icon } from "./icon";

export function ContentCard({ entry }: { entry: FeedEntry }) {
  return entry.content.type === "shuoshuo" ? (
    <ShuoshuoCard entry={entry} />
  ) : (
    <PostCard content={entry.content} />
  );
}

export function Feed({
  snapshot,
  page = 1,
  type = "all",
  pathname = "/",
}: {
  snapshot: PublicSnapshot;
  page?: number;
  type?: FeedType;
  pathname?: string;
}) {
  const result = queryFeed(snapshot, { page, type });
  return (
    <>
      <PagePresentation site={snapshot.site} />
      <SiteNotice
        title={snapshot.site.settings?.site.notice_title}
        content={snapshot.site.notice ?? ""}
      />
      {type === "shuoshuo" && (
        <header className="surface page-heading">
          <Icon name="leaf" />
          <div>
            <h1>说说</h1>
            <p>把日常的光，收进简短的句子里。</p>
          </div>
        </header>
      )}
      <div className="article-list">
        {result.items.length ? (
          result.items.map((entry) => (
            <ContentCard key={entry.content.id} entry={entry} />
          ))
        ) : (
          <EmptyState title="这里还很安静" />
        )}
      </div>
      <Pagination
        page={result.page}
        pages={result.pages}
        pathname={pathname}
        type={type}
      />
    </>
  );
}
