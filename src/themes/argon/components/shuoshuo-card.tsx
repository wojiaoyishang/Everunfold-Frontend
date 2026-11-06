import { UiText } from "@/core/i18n/provider";
import type { FeedEntry } from "@/core/content/presentation";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { ContentMarkup } from "./content-markup";
import { AppLink as Link } from "./navigation-link";
import { ArticleMedia } from "./article-media";
import { CollapsibleContent } from "./collapsible-content";
import { RelativeTime } from "./relative-time";
import { ReactionButton } from "./reaction-button";
import { Icon } from "./icon";
import { ViewMetric } from "./reader-data";
import { ContentEditLink } from "./content-edit-link";
import { ContentLanguages } from "./content-languages";

export function ShuoshuoCardView({
  entry,
  rendered,
  detail = false,
  interactive = true,
}: {
  entry: FeedEntry;
  rendered: { html: string; features: ContentFeatures };
  detail?: boolean;
  interactive?: boolean;
}) {
  const { content, example } = entry;
  const body = (
    <ArticleMedia>
      <ContentMarkup
        className="article-content shuoshuo-content"
        html={rendered.html}
        features={rendered.features}
      />
    </ArticleMedia>
  );
  return (
    <article
      lang={content.language}
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
        <span className="content-kind">
          <UiText text="说说" />
        </span>
        {example && (
          <span className="preview-badge">
            <UiText text="示例" />
          </span>
        )}
      </header>
      <ContentLanguages content={content} />
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
      {interactive && (
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
              {content.comment_count || <UiText text="聊两句" />}
            </Link>
          ) : (
            <span>
              <UiText text="评论已关闭" />
            </span>
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
      )}
    </article>
  );
}
