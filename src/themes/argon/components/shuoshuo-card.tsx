import { UiText } from "@/core/i18n/provider";
import type {
  ContentPresentationMetadata,
  FeedEntry,
} from "@/core/content/presentation";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { BuilderContent, type BuilderRenderContext } from "../builder/content";
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
import { ArticleActions } from "./article-actions";
import { authoredStyle } from "./authored-style";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";

export function ShuoshuoCardView({
  entry,
  rendered,
  detail = false,
  interactive = true,
  glossary,
  builderContext,
}: {
  entry: Omit<FeedEntry, "content"> & { content: ContentPresentationMetadata };
  rendered: { html: string; features: ContentFeatures };
  detail?: boolean;
  interactive?: boolean;
  glossary?: GlossaryRuntimeOptions;
  builderContext?: BuilderRenderContext;
}) {
  const { content, example } = entry;
  const authored = authoredStyle(`shuoshuo-${content.id}`, content.extra_css);
  const body = (
    <ArticleMedia enabled={content.show_image_viewer !== false}>
      {content.edit_mode === "components" && content.component_document ? (
        <div className="article-content shuoshuo-content">
          <BuilderContent
            document={content.component_document}
            preview={!interactive}
            context={{
              ...builderContext,
              contentId: interactive ? content.id : undefined,
              contentRevision: interactive ? content.updated_at : undefined,
              media: content.media_urls,
              glossary: interactive ? glossary : undefined,
            }}
          />
        </div>
      ) : (
        <StaticContentMarkup
          className="article-content shuoshuo-content"
          html={rendered.html}
          features={rendered.features}
          contentId={content.id}
          contentRevision={content.updated_at}
          glossary={interactive ? glossary : undefined}
        />
      )}
    </ArticleMedia>
  );
  return (
    <article
      lang={content.language}
      className={`surface shuoshuo-card ${detail ? "shuoshuo-detail" : ""}`}
      {...authored.scope}
    >
      {authored.style}
      <span className="shuoshuo-avatar" aria-hidden="true">
        <Icon name="quote" />
      </span>
      {example && (
        <span className="preview-badge">
          <UiText text="示例" />
        </span>
      )}
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
        <CollapsibleContent limit={520} previewRatio={0.64}>
          {body}
        </CollapsibleContent>
      )}
      {interactive && (
        <footer className="shuoshuo-actions">
          <span className="shuoshuo-date">
            <Icon name="calendar" />
            <RelativeTime value={content.published_at} />
            {detail && <strong>{content.author}</strong>}
          </span>
          {detail && <ContentEditLink contentId={content.id} />}
          <ReactionButton id={content.id} count={content.reaction_count} />
          {!example && <ViewMetric contentId={content.id} record={detail} />}
          {!detail && content.comments_open && (
            <Link href={`${content.path}#comments`} expectedContent>
              <Icon name="comment" />
              {content.comment_count || <UiText text="聊两句" />}
            </Link>
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
      {detail && interactive && (
        <ArticleActions
          path={content.path}
          title={content.title}
          commentsOpen={content.comments_open}
        />
      )}
    </article>
  );
}
