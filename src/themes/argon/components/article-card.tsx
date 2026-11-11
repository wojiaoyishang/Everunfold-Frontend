import { UiText } from "@/core/i18n/provider";
import { AppLink as Link } from "./navigation-link";
import type { ContentMetadata } from "@/core/content/types";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { displayDate } from "@/core/content/query";
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
}: ArticleCardProps) {
  return (
    <article className="surface article-card" lang={content.language}>
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
        display={articleDisplay}
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
        articleDisplay={articleDisplay}
        code={code}
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
}: ArticleCardProps) {
  return (
    <div className="article-body">
      <ArticleMedia enabled={content.show_image_viewer !== false}>
        <StaticContentMarkup
          className="article-content"
          html={rendered.html}
          features={rendered.features}
          contentId={content.id}
          contentRevision={content.updated_at}
          glossary={interactive ? glossary : undefined}
          code={code}
        />
      </ArticleMedia>
      <footer className="article-footer">
        <div className="article-tags">
          {content.tags.map((tag) => (
            <Link key={tag.id} href={taxonomyHref(tag)}>
              <Icon name="tag" />
              {tag.name}
            </Link>
          ))}
        </div>
        <p>
          <UiText text="最后更新于" />{" "}
          <time dateTime={content.updated_at}>
            {displayDate(content.updated_at)}
          </time>
        </p>
      </footer>
      {interactive && articleDisplay?.show_share !== false && (
        <ArticleActions
          path={content.path}
          title={content.title}
          commentsOpen={content.comments_open ?? true}
        />
      )}
    </div>
  );
}
