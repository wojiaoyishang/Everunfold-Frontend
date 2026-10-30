import type { MouseEvent } from "react";
import { displayDate } from "@/core/content/query";
import { Icon } from "../icon";
import { CommentBody } from "./comment-body";
import { avatarTone, commentPageFor, type CommentEntry } from "./model";

export function CommentItem({
  entry,
  entries,
  path,
  floor,
  liked,
  onLike,
  onReply,
  onLocate,
}: {
  entry: CommentEntry;
  entries: readonly CommentEntry[];
  path: string;
  floor: number;
  liked: boolean;
  onLike: () => void;
  onReply: () => void;
  onLocate: (id: string) => void;
}) {
  const parent = entries.find((item) => item.id === entry.parentId);
  const parentPage = entry.parentId
    ? commentPageFor(entries, entry.parentId)
    : null;
  function locate(event: MouseEvent<HTMLAnchorElement>) {
    if (
      event.button ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey ||
      event.altKey ||
      !entry.parentId
    )
      return;
    event.preventDefault();
    onLocate(entry.parentId);
  }
  return (
    <li
      id={`comment-${entry.id}`}
      tabIndex={-1}
      className={`comment${entry.parentId ? " comment-reply" : ""}${entry.origin === "local" ? " is-local" : ""}`}
    >
      <div
        className={`comment-avatar avatar-tone-${avatarTone(entry.author)}`}
        aria-hidden="true"
      >
        {entry.host ? (
          <Icon name="campfire" />
        ) : (
          Array.from(entry.author)[0]?.toLocaleUpperCase()
        )}
      </div>
      <div className="comment-main">
        <div className="comment-heading">
          {entry.website ? (
            <a
              href={entry.website}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              <strong>{entry.author}</strong>
              <Icon name="external" />
            </a>
          ) : (
            <strong>{entry.author}</strong>
          )}
          {entry.host && (
            <span className="comment-badge host-badge">博主演示</span>
          )}
          <span className={`comment-badge origin-${entry.origin}`}>
            {entry.origin === "history"
              ? "历史留言"
              : entry.origin === "example"
                ? "示例"
                : "仅本页"}
          </span>
          <span className="comment-floor">#{floor}</span>
        </div>
        <time className="comment-time" dateTime={entry.createdAt}>
          {displayDate(entry.createdAt, true)}
        </time>
        {(entry.replyTo || parent) && (
          <p className="comment-reply-to">
            <Icon name="reply" />
            回复{" "}
            {parentPage ? (
              <a
                href={`${path}?comments_page=${parentPage}#comment-${encodeURIComponent(entry.parentId!)}`}
                onClick={locate}
              >
                @{parent?.author ?? entry.replyTo}
              </a>
            ) : (
              <span>@{entry.replyTo}</span>
            )}
          </p>
        )}
        <CommentBody
          body={entry.body}
          formatted={entry.format === "formatted"}
        />
        <div className="comment-actions">
          <button
            type="button"
            onClick={onReply}
            aria-label={`回复 ${entry.author}`}
          >
            <Icon name="reply" />
            回复
          </button>
          <button
            type="button"
            className="comment-like"
            aria-pressed={liked}
            onClick={onLike}
            aria-label={`${liked ? "取消赞同" : "赞同"} ${entry.author} 的留言`}
            title="本页互动演示"
          >
            <Icon name="heart" />
            {liked ? "已赞同" : "赞同"}
          </button>
        </div>
      </div>
    </li>
  );
}
