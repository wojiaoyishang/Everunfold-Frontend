import Image from "next/image";
import { AppLink as Link } from "./navigation-link";
import type { Content } from "@/core/content/types";
import { resourceUrl, taxonomyHref } from "@/core/content/urls";
import { Icon } from "./icon";
import { PostMeta } from "./post-meta";
import { presentationExcerpt } from "@/core/rendering/shortcodes";

export function PostCard({ content }: { content: Content }) {
  const cover = resourceUrl(content.cover_url);
  const heading = (
    <>
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
      <PostMeta content={content} />
    </>
  );
  return (
    <article className={`surface post-card ${cover ? "has-cover" : ""}`}>
      {cover && (
        <header className="post-cover">
          <Link
            href={content.path}
            className="post-cover-image"
            tabIndex={-1}
            aria-hidden="true"
          >
            <Image src={cover} alt="" width={900} height={360} unoptimized />
          </Link>
          <div className="post-cover-heading">{heading}</div>
        </header>
      )}
      <div className="post-card-body">
        {!cover && <header>{heading}</header>}
        <p className="post-excerpt">{presentationExcerpt(content.excerpt)}</p>
        <div className="post-card-footer">
          <div className="post-tags">
            <Icon name="tag" />
            {content.tags.slice(0, 5).map((tag) => (
              <Link href={taxonomyHref(tag)} key={tag.id}>
                {tag.name}
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
