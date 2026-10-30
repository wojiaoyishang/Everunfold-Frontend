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
  const articles = snapshot.contents
    .filter((entry) => entry.kind === "article")
    .sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at));
  const position = articles.findIndex((entry) => entry.id === content.id);
  const previous = position >= 0 ? articles[position + 1] : undefined;
  const next = position > 0 ? articles[position - 1] : undefined;
  return (
    <>
      <PagePresentation
        site={snapshot.site}
        toc={rendered.toc}
        id={content.id}
      />
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
          <ArticleActions path={content.path} />
        </div>
      </article>
      {(previous || next) && (
        <nav className="article-neighbors" aria-label="相邻文章">
          {previous && (
            <Link href={previous.path} className="surface">
              <small>上一篇</small>
              <span>{previous.title}</span>
            </Link>
          )}
          {next && (
            <Link href={next.path} className="surface">
              <small>下一篇</small>
              <span>{next.title}</span>
            </Link>
          )}
        </nav>
      )}
      <CommentSection
        key={content.id}
        comments={snapshot.comments[content.id] ?? []}
        path={content.path}
        initialPage={commentsPage}
      />
    </>
  );
}
