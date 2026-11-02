import type { FeedEntry } from "@/core/content/presentation";
import type { PublicSnapshot } from "@/core/content/types";
import { renderContent } from "@/core/rendering/content";
import { AppLink as Link } from "./navigation-link";
import { ArticleMedia } from "./article-media";
import { CollapsibleContent } from "./collapsible-content";
import { RelativeTime } from "./relative-time";
import { ReactionButton } from "./reaction-button";
import { Icon } from "./icon";
import { PagePresentation } from "./route-state";
import { CommentSection } from "./comments/comment-section";
import { ArticleActions } from "./article-actions";
import { ViewMetric } from "./reader-data";
import { ContentEditLink } from "./content-edit-link";

export function ShuoshuoCard({
  entry,
  detail = false,
}: {
  entry: FeedEntry;
  detail?: boolean;
}) {
  const { content, example } = entry;
  const rendered = renderContent(content);
  const body = (
    <ArticleMedia>
      <div
        className="article-content shuoshuo-content"
        dangerouslySetInnerHTML={{ __html: rendered.html }}
      />
    </ArticleMedia>
  );
  return (
    <article
      className={`surface shuoshuo-card ${detail ? "shuoshuo-detail" : ""}`}
    >
      <header className="shuoshuo-meta">
        <span className="shuoshuo-avatar">
          <Icon name="leaf" />
        </span>
        <div>
          <strong>{content.author}</strong>
          <RelativeTime value={content.published_at} />
        </div>
        <span className="content-kind">说说</span>
        {example && <span className="preview-badge">示例</span>}
      </header>
      {content.title &&
        (detail ? (
          <h1>{content.title}</h1>
        ) : (
          <h2>
            <Link href={content.path} expectedContent>
              {content.title}
            </Link>
          </h2>
        ))}
      {detail ? (
        body
      ) : (
        <CollapsibleContent limit={240}>{body}</CollapsibleContent>
      )}
      <footer className="shuoshuo-actions">
        {detail && <ContentEditLink contentId={content.id} />}
        <ReactionButton id={content.id} count={content.reaction_count} />
        {!example && <ViewMetric contentId={content.id} />}
        {content.comments_open ? (
          <Link
            href={detail ? "#comments" : `${content.path}#comments`}
            expectedContent={!detail}
          >
            <Icon name="comment" />
            {content.comment_count || "聊两句"}
          </Link>
        ) : (
          <span>评论已关闭</span>
        )}
        {!detail && (
          <Link
            className="shuoshuo-open"
            href={content.path}
            expectedContent
            aria-label={`打开说说：${content.title || "无标题随记"}`}
          >
            <Icon name="arrow" />
          </Link>
        )}
      </footer>
    </article>
  );
}

export function ShuoshuoDetail({
  entry,
  snapshot,
}: {
  entry: FeedEntry;
  snapshot: PublicSnapshot;
}) {
  return (
    <>
      <PagePresentation site={snapshot.site} id={entry.content.id} />
      {entry.example && (
        <p className="preview-notice">
          说说效果预览 · 以下内容为虚构样例，正式内容将在后续导入。
        </p>
      )}
      <ShuoshuoCard entry={entry} detail />
      <div className="surface shuoshuo-share">
        <ArticleActions
          path={entry.content.path}
          title={entry.content.title}
          commentsOpen={entry.content.comments_open}
        />
      </div>
      <CommentSection
        open={entry.content.comments_open}
        comments={snapshot.comments[entry.content.id] ?? []}
        path={entry.content.path}
      />
    </>
  );
}
