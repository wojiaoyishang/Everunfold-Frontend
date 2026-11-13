import { ArticleAgeNotice } from "./article-age-notice";
import { AppLink as Link } from "./navigation-link";
import type { BuilderRenderContext } from "../builder/content";
import { BuilderContent } from "../builder/content";
import type { ContentMetadata } from "@/core/content/types";
import type { ContentFeatures } from "@/core/rendering/features/model";
import {
  ArticleAfterword,
  articleDisplay as resolveDisplay,
  readingMinutes,
} from "./article-reading";
import { taxonomyHref } from "@/core/content/urls";
import { StaticContentMarkup } from "./content-markup-static";
import {
  ServerThemeComponent,
  ServerThemeSlot,
} from "@/core/extensions/server-components";
import { ArticleActions } from "./article-actions";
import { ArticleMedia } from "./article-media";
import { Icon } from "./icon";
import type { GlossaryRuntimeOptions } from "@/core/glossary/runtime";
import type {
  ArticleDisplayPreferences,
  CodePreferences,
} from "@/core/contracts/settings";

type ArticleCardProps = {
  theme: string;
  content: ContentMetadata;
  rendered: { html: string; features: ContentFeatures };
  interactive?: boolean;
  glossary?: GlossaryRuntimeOptions;
  articleDisplay?: ArticleDisplayPreferences;
  code?: CodePreferences;
  builderContext?: BuilderRenderContext;
};

/** The reading surface is shared by publication and authorized draft previews. */
export function ArticleCard({
  theme,
  content,
  rendered,
  interactive = true,
  glossary,
  articleDisplay,
  code,
  builderContext,
}: ArticleCardProps) {
  const display = resolveDisplay(content, articleDisplay);
  return (
    <article
      className="surface article-card"
      lang={content.language}
      data-article-layout={content.article_layout}
    >
      <ServerThemeSlot
        theme={theme}
        name="article.header.before"
        context={{ content, preview: !interactive }}
      />
      <ServerThemeComponent
        theme={theme}
        name="public.article.header"
        content={content}
        interactive={interactive}
        liveMetrics={interactive}
        display={display}
        minutes={readingMinutes(rendered.html, display)}
      />
      <ServerThemeSlot
        theme={theme}
        name="article.header.after"
        context={{ content, preview: !interactive }}
      />
      <ServerThemeSlot
        theme={theme}
        name="article.body.before"
        context={{ content, preview: !interactive }}
      />
      <ServerThemeComponent
        theme={theme}
        name="public.article.body"
        content={content}
        rendered={rendered}
        interactive={interactive}
        glossary={glossary}
        articleDisplay={display}
        code={code}
        builderContext={builderContext}
      />
      <ServerThemeSlot
        theme={theme}
        name="article.body.after"
        context={{ content, preview: !interactive }}
      />
    </article>
  );
}

export function ArticleBody({
  content,
  rendered,
  interactive = true,
  glossary,
  articleDisplay,
  code,
  builderContext,
}: ArticleCardProps) {
  return (
    <div className="article-body">
      <ArticleAgeNotice content={content} display={articleDisplay} />
      <ArticleMedia enabled={content.show_image_viewer !== false}>
        {content.edit_mode === "components" && content.component_document ? (
          <div className="article-content">
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
            className="article-content"
            html={rendered.html}
            features={rendered.features}
            contentId={content.id}
            contentRevision={content.updated_at}
            glossary={interactive ? glossary : undefined}
            code={code}
          />
        )}
      </ArticleMedia>
      <ArticleAfterword content={content} display={articleDisplay} />
      {content.tags.length > 0 && (
        <footer className="article-footer">
          <div className="article-tags">
            {content.tags.map((tag) => (
              <Link key={tag.id} href={taxonomyHref(tag)}>
                <Icon name="tag" />
                {tag.name}
              </Link>
            ))}
          </div>
        </footer>
      )}
      {interactive && articleDisplay?.show_share !== false && (
        <ArticleActions
          path={content.path}
          title={content.title}
          commentsOpen={
            articleDisplay?.show_comments !== false &&
            (content.comments_open ?? true)
          }
        />
      )}
    </div>
  );
}
