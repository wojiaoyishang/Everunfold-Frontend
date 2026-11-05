import Image from "next/image";
import { AppLink as Link } from "./navigation-link";
import type { ReadableContent } from "@/core/content/types";
import { resourceUrl, taxonomyHref } from "@/core/content/urls";
import { Icon } from "./icon";
import { PostMeta } from "./post-meta";
import { shortcodeExcerpt } from "@/core/rendering/native-shortcodes";

export function PostCard({ content }: { content: ReadableContent }) {
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
        <h2 className="post-title">{content.title}</h2>
      </div>
      <PostMeta content={content} />
    </>
  );
  return (
    <article className={`surface post-card ${cover ? "has-cover" : ""}`}>
      <Link
        href={content.path}
        expectedContent
        className="post-card-open"
        aria-label={content.title}
      />
      {cover && (
        <header className="post-cover">
          <div className="post-cover-image" aria-hidden="true">
            <Image src={cover} alt="" width={900} height={360} unoptimized />
          </div>
          <div className="post-cover-heading">{heading}</div>
        </header>
      )}
      <div className="post-card-body">
        {!cover && <header>{heading}</header>}
        <p className="post-excerpt">{shortcodeExcerpt(content.excerpt)}</p>
        <div className="post-card-footer">
          <div className="post-tags">
            <Icon name="tag" />
            {content.tags.slice(0, 5).map((tag) => (
              <Link href={taxonomyHref(tag)} key={tag.id}>
                {tag.name}
              </Link>
            ))}
          </div>
          <span className="read-more" aria-hidden="true">
            阅读全文
            <Icon name="arrow" />
          </span>
        </div>
      </div>
    </article>
  );
}
