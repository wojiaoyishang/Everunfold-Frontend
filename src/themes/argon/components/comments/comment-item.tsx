import { Button, TextLink } from "@/themes/argon/components/ui/primitives";
import type { MouseEvent } from "react";
import { RelativeTime } from "../relative-time";
import { CollapsibleContent } from "../collapsible-content";
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
            <TextLink
              href={entry.website}
              target="_blank"
              rel="nofollow noopener noreferrer"
            >
              <strong>{entry.author}</strong>
              <Icon name="external" />
            </TextLink>
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
        <span className="comment-time">
          <RelativeTime value={entry.createdAt} />
        </span>
        {(entry.replyTo || parent) && (
          <p className="comment-reply-to">
            <Icon name="reply" />
            回复{" "}
            {parentPage ? (
              <TextLink
                href={`${path}?comments_page=${parentPage}#comment-${encodeURIComponent(entry.parentId!)}`}
                onClick={locate}
              >
                @{parent?.author ?? entry.replyTo}
              </TextLink>
            ) : (
              <span>@{entry.replyTo}</span>
            )}
          </p>
        )}
        <CollapsibleContent limit={360}>
          <CommentBody
            body={entry.body}
            formatted={entry.format === "formatted"}
          />
        </CollapsibleContent>
        <div className="comment-actions">
          <Button
            type="button"
            onClick={onReply}
            aria-label={`回复 ${entry.author}`}
          >
            <Icon name="reply" />
            回复
          </Button>
          <Button
            type="button"
            className="comment-like"
            aria-pressed={liked}
            onClick={onLike}
            aria-label={`${liked ? "取消赞同" : "赞同"} ${entry.author} 的留言`}
            title="本页互动演示"
          >
            <Icon name="heart" />
            {liked ? "已赞同" : "赞同"}
          </Button>
        </div>
      </div>
    </li>
  );
}
