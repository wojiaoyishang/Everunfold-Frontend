import type { PublicComment } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";

export const COMMENT_PAGE_SIZE = 6;
export const COMMENT_MAX_LENGTH = 2000;

/** Presentation-only data. Demo/local entries never become public API records. */
export interface CommentEntry {
  id: string;
  parentId: string | null;
  author: string;
  body: string;
  createdAt: string;
  replyTo?: string | null;
  origin: "history" | "example" | "local";
  format: "plain" | "formatted";
  host?: boolean;
  website?: string;
}

export interface CommentDraft {
  author: string;
  body: string;
  website: string;
  formatted: boolean;
}
export type DraftErrors = Partial<
  Record<"author" | "body" | "website", string>
>;

export function historicalComments(
  comments: readonly PublicComment[],
): CommentEntry[] {
  return comments.map((comment) => ({
    id: comment.id,
    parentId: comment.parent_id,
    author: comment.author,
    body: comment.content,
    createdAt: comment.created_at,
    replyTo: comment.reply_to,
    origin: "history",
    format: comment.format === "markdown" ? "formatted" : "plain",
    website: commentWebsite(comment.website),
  }));
}

export function orderComments(
  comments: readonly CommentEntry[],
): CommentEntry[] {
  return [...comments].sort(
    (a, b) =>
      Date.parse(a.createdAt) - Date.parse(b.createdAt) ||
      a.id.localeCompare(b.id),
  );
}

export function commentPage(
  comments: readonly CommentEntry[],
  requested: number,
) {
  const pages = Math.max(1, Math.ceil(comments.length / COMMENT_PAGE_SIZE));
  const page = Math.min(
    pages,
    Math.max(1, Number.isFinite(requested) ? Math.floor(requested) : 1),
  );
  return {
    page,
    pages,
    entries: comments.slice(
      (page - 1) * COMMENT_PAGE_SIZE,
      page * COMMENT_PAGE_SIZE,
    ),
  };
}

export function commentPageFor(
  comments: readonly CommentEntry[],
  id: string,
): number | null {
  const index = comments.findIndex((comment) => comment.id === id);
  return index < 0 ? null : Math.floor(index / COMMENT_PAGE_SIZE) + 1;
}

export function commentWebsite(value?: string | null): string | undefined {
  return value && /^https?:\/\//i.test(value.trim())
    ? (publicHref(value) ?? undefined)
    : undefined;
}

export function validateDraft(draft: CommentDraft): DraftErrors {
  const errors: DraftErrors = {};
  if (!draft.author.trim()) errors.author = "请留下一个称呼。";
  else if (draft.author.trim().length > 40)
    errors.author = "称呼请控制在 40 字以内。";
  if (!draft.body.trim()) errors.body = "写点什么，再加入这场对话吧。";
  else if (draft.body.length > COMMENT_MAX_LENGTH)
    errors.body = "留言请控制在 2000 字以内。";
  if (draft.website.trim() && !commentWebsite(draft.website))
    errors.website = "网站地址需要以 https:// 或 http:// 开头。";
  return errors;
}

/** Insert formatting at the selection, preserving the rest of the draft. */
export function insertCommentText(
  value: string,
  start: number,
  end: number,
  before: string,
  after = "",
  placeholder = "",
) {
  const selection = value.slice(start, end) || placeholder;
  const text =
    value.slice(0, start) + before + selection + after + value.slice(end);
  return text.length > COMMENT_MAX_LENGTH
    ? null
    : {
        text,
        start: start + before.length,
        end: start + before.length + selection.length,
      };
}

export function avatarTone(value: string): number {
  return (
    Array.from(value).reduce(
      (sum, character) => sum + character.codePointAt(0)!,
      0,
    ) % 4
  );
}
