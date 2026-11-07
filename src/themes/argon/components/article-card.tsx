import { UiText } from "@/core/i18n/provider";
import { AppLink as Link } from "./navigation-link";
import type { Content } from "@/core/content/types";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { displayDate } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { ContentMarkup } from "./content-markup";
import { ExtensionComponent } from "@/core/extensions/components";
import { ThemeSlot } from "@/core/themes/presentation";
import { ArticleActions } from "./article-actions";
import { ArticleMedia } from "./article-media";
import { Icon } from "./icon";

type ArticleCardProps = {
  content: Content;
  rendered: { html: string; features: ContentFeatures };
  interactive?: boolean;
};

/** The reading surface is shared by publication and authorized draft previews. */
export function ArticleCard({
  content,
  rendered,
  interactive = true,
}: ArticleCardProps) {
  return (
    <article className="surface article-card" lang={content.language}>
      <ThemeSlot
        name="article.header.before"
        context={{ content, preview: !interactive }}
      />
      <ExtensionComponent
        name="public.article.header"
        content={content}
        interactive={interactive}
        liveMetrics={interactive}
      />
      <ThemeSlot
        name="article.header.after"
        context={{ content, preview: !interactive }}
      />
      <ThemeSlot
        name="article.body.before"
        context={{ content, preview: !interactive }}
      />
      <ExtensionComponent
        name="public.article.body"
        content={content}
        rendered={rendered}
        interactive={interactive}
      />
      <ThemeSlot
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
}: ArticleCardProps) {
  return (
    <div className="article-body">
      <ArticleMedia>
        <ContentMarkup
          className="article-content"
          html={rendered.html}
          features={rendered.features}
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
      {interactive && (
        <ArticleActions
          path={content.path}
          title={content.title}
          commentsOpen={content.comments_open ?? true}
        />
      )}
    </div>
  );
}
