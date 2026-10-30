import Image from "next/image";
import Link from "next/link";

import type { Content } from "@/core/content/types";
import { displayDate } from "@/core/content/query";
import { resourceUrl, taxonomyHref } from "@/core/content/urls";
import { Icon } from "./icon";

export function PostCard({ content }: { content: Content }) {
  const cover = resourceUrl(content.cover_url);
  return (
    <article className="surface post-card">
      {cover && (
        <Link
          href={content.path}
          className="post-cover"
          tabIndex={-1}
          aria-hidden="true"
        >
          <Image src={cover} alt="" width={900} height={360} unoptimized />
        </Link>
      )}
      <div className="post-card-body">
        <div className="post-title-row">
          {content.pinned && (
            <span className="pinned-badge" title="置顶文章">
              <Icon name="pin" />
              <span>置顶</span>
            </span>
          )}
          <h2 className="post-title">
            <Link href={content.path}>{content.title}</Link>
          </h2>
        </div>
        <div className="post-meta">
          <time dateTime={content.published_at}>
            <Icon name="calendar" />
            {displayDate(content.published_at)}
          </time>
          {content.categories.slice(0, 2).map((category) => (
            <Link key={category.id} href={taxonomyHref(category)}>
              <Icon name="folder" />
              {category.name}
            </Link>
          ))}
          <span>
            <Icon name="clock" />
            {content.reading_minutes} 分钟
          </span>
          <Link href={`${content.path}#comments`}>
            <Icon name="comment" />
            {content.comment_count}
          </Link>
        </div>
        <p className="post-excerpt">{content.excerpt}</p>
        <div className="post-card-footer">
          <div className="post-tags">
            {content.tags.slice(0, 4).map((tag) => (
              <Link href={taxonomyHref(tag)} key={tag.id}>
                # {tag.name}
              </Link>
            ))}
          </div>
          <Link href={content.path} className="read-more">
            阅读全文
            <Icon name="arrow" />
          </Link>
        </div>
      </div>
    </article>
  );
}
