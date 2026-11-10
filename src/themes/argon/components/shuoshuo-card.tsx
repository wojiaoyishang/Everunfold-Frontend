import { UiText } from "@/core/i18n/provider";
import type {
  ContentPresentationMetadata,
  FeedEntry,
} from "@/core/content/presentation";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { StaticContentMarkup } from "./content-markup-static";
import { AppLink as Link } from "./navigation-link";
import { ArticleMedia } from "./article-media";
import { CollapsibleContent } from "./collapsible-content";
import { RelativeTime } from "./relative-time";
import { ReactionButton } from "./reaction-button";
import { Icon } from "./icon";
import { ViewMetric } from "./reader-data";
import { ContentEditLink } from "./content-edit-link";
import { ContentLanguages } from "./content-languages";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";

export function ShuoshuoCardView({
  entry,
  rendered,
  detail = false,
  interactive = true,
  glossary,
}: {
  entry: Omit<FeedEntry, "content"> & { content: ContentPresentationMetadata };
  rendered: { html: string; features: ContentFeatures };
  detail?: boolean;
  interactive?: boolean;
  glossary?: GlossaryRuntimeOptions;
}) {
  const { content, example } = entry;
  const body = (
    <ArticleMedia>
      <StaticContentMarkup
        className="article-content shuoshuo-content"
        html={rendered.html}
        features={rendered.features}
        contentId={content.id}
        contentRevision={content.updated_at}
        glossary={interactive ? glossary : undefined}
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
      <ContentLanguages
        content={{
          id: content.id,
          language: content.language,
          translations: content.translations,
        }}
      />
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
