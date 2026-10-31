import type { ReadableContent } from "@/core/content/types";
import { displayDate } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";
import { ViewMetric } from "./reader-data";

export function PostMeta({
  content,
  article = false,
}: {
  content: ReadableContent;
  article?: boolean;
}) {
  return (
    <div className="post-meta">
      {article && (
        <span>
          <Icon name="user" />
          {content.author}
        </span>
      )}
      <time dateTime={content.published_at}>
        <Icon name="calendar" />
        {displayDate(content.published_at)}
      </time>
      {article ? (
        <span>
          <Icon name="book" />
          {content.word_count.toLocaleString("zh-CN")} 字
        </span>
      ) : (
        content.categories.slice(0, 2).map((category) => (
          <Link key={category.id} href={taxonomyHref(category)}>
            <Icon name="folder" />
            {category.name}
          </Link>
        ))
      )}
      <span>
        <Icon name="clock" />
        {content.reading_minutes} 分钟
      </span>
      <Link
        href={article ? "#comments" : `${content.path}#comments`}
        expectedContent={!article}
      >
        <Icon name="comment" />
        {content.comment_count}
      </Link>
      <ViewMetric contentId={content.id} />
    </div>
  );
}
