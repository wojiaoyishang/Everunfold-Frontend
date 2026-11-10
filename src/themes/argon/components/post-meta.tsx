import { UiText } from "@/core/i18n/provider";
import type { ReadableContentMetadata } from "@/core/content/types";
import { displayDate } from "@/core/content/query";
import { taxonomyHref } from "@/core/content/urls";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";
import { ViewMetric } from "./reader-data";
import { ContentEditLink } from "./content-edit-link";
import type { ArticleDisplayPreferences } from "@/core/contracts/settings";

export function PostMeta({
  content,
  article = false,
  liveMetrics = true,
  interactive = true,
  display,
}: {
  content: ReadableContentMetadata;
  article?: boolean;
  liveMetrics?: boolean;
  interactive?: boolean;
  display?: ArticleDisplayPreferences;
}) {
  const locked = Boolean(content.access && content.access !== "public");
  return (
    <div className="post-meta">
      {article && display?.show_author !== false && (
        <span>
          <Icon name="user" />
          {content.author}
        </span>
      )}
      {display?.show_date !== false && (
        <time dateTime={content.published_at}>
          <Icon name="calendar" />
          {displayDate(content.published_at)}
        </time>
      )}
      {locked ? (
        <span>
          <Icon name={content.opens_at ? "clock" : "lock"} />
          {content.access === "captcha" ? (
            <UiText text="验证后阅读" />
          ) : content.opens_at ? (
            <UiText text="定时开放" />
          ) : (
            <UiText text="密码保护" />
          )}
        </span>
      ) : article && display?.show_word_count !== false ? (
        <span>
          <Icon name="book" />
          {content.word_count.toLocaleString("zh-CN")} <UiText text="字" />
        </span>
      ) : (
        content.categories.slice(0, 2).map((category) => (
          <Link key={category.id} href={taxonomyHref(category)}>
            <Icon name="folder" />
            {category.name}
          </Link>
        ))
      )}
      {!locked && display?.show_reading_time !== false && (
        <span>
          <Icon name="clock" />
          {content.reading_minutes} <UiText text="分钟" />
        </span>
      )}
      {interactive &&
        !locked &&
        display?.show_comments !== false &&
        (content.comments_open !== false || content.comment_count > 0) && (
          <Link
            href={article ? "#comments" : `${content.path}#comments`}
            expectedContent={!article}
          >
            <Icon name="comment" />
            {content.comment_count}
          </Link>
        )}
      {!locked && liveMetrics && display?.show_views !== false && (
        <ViewMetric contentId={content.id} />
      )}
      {article && interactive && <ContentEditLink contentId={content.id} />}
    </div>
  );
}
