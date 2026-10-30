import Link from "next/link";
import type { Content, PublicSnapshot } from "@/core/content/types";
import { displayDate } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { renderContent } from "@/core/rendering/content";
import { CommentText } from "./comment-text";
import { BlogShell } from "./shell";
import { Icon } from "./icon";

function Comments({
  snapshot,
  content,
  page,
}: {
  snapshot: PublicSnapshot;
  content: Content;
  page: number;
}) {
  const comments = [...(snapshot.comments[content.id] ?? [])].sort(
    (a, b) =>
      Date.parse(a.created_at) - Date.parse(b.created_at) ||
      a.id.localeCompare(b.id),
  );
  const pageSize = 20;
  const pages = Math.max(1, Math.ceil(comments.length / pageSize));
  const shown = comments.slice((page - 1) * pageSize, page * pageSize);
  return (
    <section id="comments" className="surface comments-card">
      <h2>
        <Icon name="comment" />
        评论 <span>{comments.length}</span>
      </h2>
      <p className="comments-notice">
        这里保存着大家留下的声音。评论暂未开放提交。
      </p>
      <ol className="comment-list">
        {shown.map((comment) => {
          const parentIndex = comment.parent_id
            ? comments.findIndex((entry) => entry.id === comment.parent_id)
            : -1;
          const parentPage =
            parentIndex >= 0 ? Math.floor(parentIndex / pageSize) + 1 : null;
          const target = parentPage
            ? `${content.path}${parentPage > 1 ? `?comments_page=${parentPage}` : ""}#comment-${comment.parent_id}`
            : null;
          return (
            <li
              id={`comment-${comment.id}`}
              key={comment.id}
              className={`comment ${comment.parent_id ? "comment-reply" : ""}`}
            >
              <div className="comment-avatar" aria-hidden="true">
                {comment.author.slice(0, 1).toLocaleUpperCase()}
              </div>
              <div className="comment-main">
                <div className="comment-heading">
                  <strong>{comment.author}</strong>
                  <time dateTime={comment.created_at}>
                    {displayDate(comment.created_at, true)}
                  </time>
                </div>
                {comment.reply_to && (
                  <p className="comment-reply-to">
                    回复{" "}
                    {target ? (
                      <a href={target}>@{comment.reply_to}</a>
                    ) : (
                      <span>@{comment.reply_to}</span>
                    )}
                  </p>
                )}
                <CommentText content={comment.content} />
              </div>
            </li>
          );
        })}
      </ol>
      {!shown.length && (
        <p className="comment-empty">
          {comments.length ? "这一页没有评论。" : "还没有评论。"}
        </p>
      )}
      {pages > 1 && (
        <nav className="comment-pagination" aria-label="评论分页">
          {page > 1 && (
            <Link href={`${content.path}?comments_page=${page - 1}#comments`}>
              上一页
            </Link>
          )}
          <span>
            第 {page} / {pages} 页
          </span>
          {page < pages && (
            <Link href={`${content.path}?comments_page=${page + 1}#comments`}>
              下一页
            </Link>
          )}
        </nav>
      )}
    </section>
  );
}

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
    <BlogShell site={snapshot.site} toc={rendered.toc} sidebarKey={content.id}>
      <article className="surface article-card">
        <header className="article-header">
          <div className="article-categories">
            {content.categories.map((category) => (
              <Link key={category.id} href={taxonomyHref(category)}>
                {category.name}
              </Link>
            ))}
          </div>
          <h1>{content.title}</h1>
          <div className="post-meta">
            <span>
              <Icon name="user" />
              {content.author}
            </span>
            <time dateTime={content.published_at}>
              <Icon name="calendar" />
              {displayDate(content.published_at)}
            </time>
            <span>
              <Icon name="book" />
              {content.word_count.toLocaleString("zh-CN")} 字
            </span>
            <span>
              <Icon name="clock" />
              {content.reading_minutes} 分钟
            </span>
            <a href="#comments">
              <Icon name="comment" />
              {content.comment_count}
            </a>
          </div>
        </header>
        <div
          className="article-content"
          dangerouslySetInnerHTML={{ __html: rendered.html }}
        />
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
      <Comments snapshot={snapshot} content={content} page={commentsPage} />
    </BlogShell>
  );
}
