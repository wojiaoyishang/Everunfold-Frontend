import { UiText } from "@/core/i18n/provider";
import type { PublicSnapshot } from "@/core/content/types";
import {
  queryFeed,
  type FeedEntry,
  type FeedType,
} from "@/core/content/presentation";
import { ServerThemeComponent } from "@/core/extensions/server-components";
import { contentMetadata } from "@/core/content/client-data";
import { ShuoshuoCard } from "./shuoshuo";
import { PagePresentation } from "./route-state";
import { Pagination } from "./pagination";
import { EmptyState } from "./empty-state";
import { SiteNotice } from "./site-notice";
import { Icon } from "./icon";
import { themeProfile } from "@/core/settings/theme-options";
import "./feed-layout.css";

export function ContentCard({
  entry,
  theme,
}: {
  entry: FeedEntry;
  theme: string;
}) {
  return entry.content.type === "shuoshuo" ? (
    <ShuoshuoCard entry={entry} theme={theme} />
  ) : (
    <ServerThemeComponent
      theme={theme}
      name="public.post.card"
      content={contentMetadata(entry.content)}
    />
  );
}

export function Feed({
  theme,
  snapshot,
  page = 1,
  type = "all",
  pathname = "/",
  heading,
  homepage = false,
}: {
  theme: string;
  snapshot: PublicSnapshot;
  page?: number;
  type?: FeedType;
  pathname?: string;
  heading?: { title: string; description?: string };
  homepage?: boolean;
}) {
  const preferences = themeProfile(snapshot.site.settings)?.feed;
  const result = queryFeed(snapshot, {
    page,
    type,
    pageSize: preferences?.page_size ?? 10,
    excludeTaxonomies: homepage
      ? preferences?.excluded_taxonomy_ids
      : undefined,
  });
  return (
    <>
      <PagePresentation site={snapshot.site} />
      <SiteNotice
        title={snapshot.site.settings?.site.notice_title}
        content={snapshot.site.notice ?? ""}
      />
      {heading && (
        <header className="surface page-heading">
          <Icon name="book" />
          <div>
            <h1>{heading.title}</h1>
            {heading.description && <p>{heading.description}</p>}
          </div>
        </header>
      )}
      {type === "shuoshuo" && (
        <header className="surface page-heading">
          <Icon name="leaf" />
          <div>
            <h1>
              <UiText text="说说" />
            </h1>
            <p>
              <UiText text="把日常的光，收进简短的句子里。" />
            </p>
          </div>
        </header>
      )}
      {result.items.length ? (
        <div className="feed-layout-container">
          <div
            className="article-list feed-layout"
            data-layout={homepage ? preferences?.layout : undefined}
            data-density={homepage ? preferences?.density : undefined}
          >
            {result.items.map((entry) => (
              <ContentCard key={entry.content.id} entry={entry} theme={theme} />
            ))}
          </div>
        </div>
      ) : (
        <EmptyState title="这里还很安静" />
      )}
      <Pagination
        page={result.page}
        pages={result.pages}
        pathname={pathname}
        type={type}
      />
    </>
  );
}
