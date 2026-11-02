import { AppLink as Link } from "./navigation-link";
import type { Content, PublicSnapshot } from "@/core/content/types";
import { displayDate } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { renderContent } from "@/core/rendering/content";
import { CommentSection } from "./comments/comment-section";
import { PagePresentation } from "./route-state";
import { ArticleHeader } from "./article-header";
import { ArticleActions } from "./article-actions";
import { ArticleMedia } from "./article-media";
import { Icon } from "./icon";
import { RelatedArticles } from "./related-articles";
import { ArticleNeighbors } from "./article-neighbors";
import { ReaderPreviewRegistration } from "./reader-preview";

export function Article({
  snapshot,
  content,
  commentsPage = 1,
}: {
  snapshot: PublicSnapshot;
  content: Content;
  commentsPage?: number;
}) {
  const rendered = renderContent(content);
  return (
    <>
      <PagePresentation
        site={snapshot.site}
        toc={rendered.toc}
        id={content.id}
      />
      {content.kind === "article" && <ReaderPreviewRegistration />}
      <article className="surface article-card">
        <ArticleHeader content={content} />
        <div className="article-body">
          <ArticleMedia>
            <div
              className="article-content"
              dangerouslySetInnerHTML={{ __html: rendered.html }}
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
          <ArticleActions
            path={content.path}
            title={content.title}
            commentsOpen={content.comments_open ?? true}
          />
        </div>
      </article>
      {content.kind === "article" && (
        <div className="article-followup">
          <ArticleNeighbors snapshot={snapshot} content={content} />
          <RelatedArticles snapshot={snapshot} content={content} />
        </div>
      )}
      <CommentSection
        open={content.comments_open ?? true}
        key={content.id}
        comments={snapshot.comments[content.id] ?? []}
        path={content.path}
        initialPage={commentsPage}
      />
    </>
  );
}
