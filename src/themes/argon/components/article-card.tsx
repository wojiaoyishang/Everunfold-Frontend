import { AppLink as Link } from "./navigation-link";
import type { Content } from "@/core/content/types";
import type { ContentFeatures } from "@/core/rendering/features/model";
import { displayDate } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { ContentMarkup } from "./content-markup";
import { ArticleHeader } from "./article-header";
import { ArticleActions } from "./article-actions";
import { ArticleMedia } from "./article-media";
import { Icon } from "./icon";

/** The reading surface is shared by publication and authorized draft previews. */
export function ArticleCard({
  content,
  rendered,
  interactive = true,
}: {
  content: Content;
  rendered: { html: string; features: ContentFeatures };
  interactive?: boolean;
}) {
  return (
    <article className="surface article-card">
      <ArticleHeader
        content={content}
        interactive={interactive}
        liveMetrics={interactive}
      />
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
            最后更新于{" "}
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
    </article>
  );
}
