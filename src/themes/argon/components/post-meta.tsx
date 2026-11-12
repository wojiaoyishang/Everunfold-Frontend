import { Fragment, type ReactNode } from "react";
import { UiText } from "@/core/i18n/provider";
import type { ReadableContentMetadata } from "@/core/content/types";
import { taxonomyHref } from "@/core/content/urls";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";
import { ViewMetric } from "./reader-data";
import { ContentEditLink } from "./content-edit-link";
import { PublicDate } from "./public-date";
import type { ArticleDisplayPreferences } from "@/core/contracts/settings";

const defaultOrder = [
  "author",
  "published",
  "updated",
  "words",
  "reading",
  "comments",
  "views",
] as const;

export function PostMeta({
  content,
  article = false,
  liveMetrics = true,
  interactive = true,
  display,
  minutes,
}: {
  content: ReadableContentMetadata;
  article?: boolean;
  liveMetrics?: boolean;
  interactive?: boolean;
  display?: ArticleDisplayPreferences;
  minutes?: number;
}) {
  const locked = Boolean(content.access && content.access !== "public");
  const fields: Record<(typeof defaultOrder)[number], ReactNode> = {
    author: article && display?.show_author !== false && (
      <span>
        <Icon name="user" />
        {content.author}
      </span>
    ),
    published: display?.show_date !== false && (
      <time dateTime={content.published_at}>
        <Icon name="calendar" />
        {article && display?.show_updated && <UiText text="发布于" />}
        <PublicDate value={content.published_at} />
      </time>
    ),
    updated: article && !locked && display?.show_updated && (
      <time dateTime={content.updated_at}>
        <Icon name="clock" />
        <UiText text="更新于" />
        <PublicDate value={content.updated_at} />
      </time>
    ),
    words:
      !locked &&
      (article
        ? display?.show_word_count !== false && (
            <span>
              <Icon name="book" />
              {content.word_count.toLocaleString("zh-CN")} <UiText text="字" />
            </span>
          )
        : content.categories.slice(0, 2).map((category) => (
            <Link key={category.id} href={taxonomyHref(category)}>
              <Icon name="folder" />
              {category.name}
            </Link>
          ))),
    reading: !locked && display?.show_reading_time !== false && (
      <span>
        <Icon name="clock" />
        {minutes ?? content.reading_minutes} <UiText text="分钟" />
      </span>
    ),
    comments: interactive &&
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
      ),
    views: !locked && liveMetrics && display?.show_views !== false && (
      <ViewMetric contentId={content.id} />
    ),
  };
  const order = new Set([...(display?.meta_order ?? []), ...defaultOrder]);
  return (
    <div className="post-meta">
      {[...order].map((key) => (
        <Fragment key={key}>{fields[key]}</Fragment>
      ))}
      {locked && (
        <span>
          <Icon name={content.opens_at ? "clock" : "lock"} />
          <UiText
            text={
              content.access === "captcha"
                ? "验证后阅读"
                : content.opens_at
                  ? "定时开放"
                  : "密码保护"
            }
          />
        </span>
      )}
      {article && interactive && <ContentEditLink contentId={content.id} />}
    </div>
  );
}
