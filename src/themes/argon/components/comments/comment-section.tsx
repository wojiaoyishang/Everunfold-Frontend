"use client";
import { UiText } from "@/core/i18n/provider";

import { randomUUID } from "@/core/browser/crypto";
import { Button, TextLink } from "@/themes/argon/components/ui/primitives";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PublicComment } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";
import { useCommentLocation } from "./use-comment-location";
import { Icon } from "../icon";
import { CommentComposer } from "./comment-composer";
import { CommentItem } from "./comment-item";
import { exampleComments } from "./examples";
import { useCaptcha } from "@/core/captcha/use-captcha";
import {
  submitReaderComment,
  type CaptchaAnswer,
} from "@/core/contracts/captcha";
import { RequestError } from "@/core/http/request";
import { commentSubmissionFailure } from "./submission";
import { useReaderData } from "../reader-data";
import { usePublicAccount } from "@/core/auth/use-public-account";
import { useCommentLikes } from "./use-comment-likes";
import {
  COMMENT_PAGE_SIZE,
  commentPage,
  commentPageFor,
  historicalComments,
  orderComments,
  type CommentDraft,
  type CommentEntry,
} from "./model";

export function CommentSection({
  comments,
  path,
  initialPage = 1,
  open = true,
  contentId,
  readReceipt,
  interactive = true,
}: {
  comments: PublicComment[];
  path: string;
  initialPage?: number;
  open?: boolean;
  contentId?: string;
  readReceipt?: string;
  /** Previews can show history without challenge, like or submission requests. */
  interactive?: boolean;
}) {
  const { store } = useReaderData();
  const account = usePublicAccount(store.baseUrl);
  const signedInName =
    account.state.phase === "ready" && account.state.session.user
      ? account.state.session.user.display_name ||
        account.state.session.user.username
      : null;
  const captcha = useCaptcha(
    store.baseUrl,
    "comment",
    contentId,
    Boolean(contentId && open && interactive),
    { lazy: true },
  );
  const submission = useRef<{ fingerprint: string; id: string } | null>(null);
  const [local, setLocal] = useState<CommentEntry[]>([]);
  const [examples, setExamples] = useState(!contentId);
  const [reply, setReply] = useState<{
    entry: CommentEntry | null;
    active: boolean;
  }>({ entry: null, active: false });
  const [requestedPage, setRequestedPage] = useState(initialPage);
  const [continuous, setContinuous] = useState(false);
  const [target, setTarget] = useState<{ id: string } | null>(null);
  const initialAnchor = useRef(false);
  const entries = useMemo(
    () =>
      orderComments([
        ...historicalComments(comments),
        ...(examples && open ? exampleComments : []),
        ...local,
      ]),
    [comments, examples, local, open],
  );
  const { entries: paged, page, pages } = commentPage(entries, requestedPage);
  const shown = continuous ? entries.slice(0, page * COMMENT_PAGE_SIZE) : paged;
  const likes = useCommentLikes(
    shown
      .filter((entry) => entry.origin === "history")
      .map((entry) => entry.id),
    contentId,
    readReceipt,
    interactive,
  );
  useCommentLocation(target, page);
  useEffect(() => {
    if (initialAnchor.current) return;
    let hash: string;
    try {
      hash = decodeURIComponent(window.location.hash.slice(1));
    } catch {
      return;
    }
    if (!hash.startsWith("comment-")) {
      initialAnchor.current = true;
      return;
    }
    const destination = commentPageFor(entries, hash.slice("comment-".length));
    if (!destination) return;
    const frame = requestAnimationFrame(() => {
      initialAnchor.current = true;
      setRequestedPage(destination);
      setTarget({ id: hash });
    });
    return () => cancelAnimationFrame(frame);
  }, [entries]);
  function locate(id: string) {
    const destination = commentPageFor(entries, id);
    if (!destination) return;
    setRequestedPage(destination);
    setTarget({ id: `comment-${id}` });
  }
  async function add(
    draft: Omit<CommentDraft, "email">,
    answer?: CaptchaAnswer,
    signal?: AbortSignal,
  ) {
    if (!interactive || !open) throw new RequestError("http", 403, 40388);
    if (contentId) {
      const parentId =
        reply.active && reply.entry?.origin === "history"
          ? reply.entry.id
          : undefined;
      const fingerprint = JSON.stringify({ draft, parentId, contentId });
      if (submission.current?.fingerprint !== fingerprint)
        submission.current = { fingerprint, id: randomUUID() };
      try {
        await submitReaderComment(
          store.baseUrl,
          {
            operation_id: submission.current.id,
            content_id: contentId,
            client_id: captcha.clientId,
            parent_id: parentId,
            author: draft.author,
            body: draft.body,
            captcha: answer,
            read_receipt: readReceipt,
          },
          { signal },
        );
        if (signal?.aborted) throw new RequestError("cancelled");
        setReply((current) => ({ ...current, active: false }));
        submission.current = null;
        return {
          accepted: true,
          message: "评论已提交，等待审核。通过审核后会公开显示。",
        };
      } catch (reason) {
        return { accepted: false, message: commentSubmissionFailure(reason) };
      }
    }
    const entry: CommentEntry = {
      id: `local-${randomUUID()}`,
      parentId: reply.active ? (reply.entry?.id ?? null) : null,
      replyTo: reply.active ? reply.entry?.author : null,
      author: draft.author,
      body: draft.body,
      createdAt: new Date().toISOString(),
      origin: "local",
      format: draft.formatted ? "formatted" : "plain",
      website: publicHref(draft.website) ?? undefined,
    };
    setLocal((current) => [...current, entry]);
    setRequestedPage(
      commentPageFor(orderComments([...entries, entry]), entry.id)!,
    );
    setTarget({ id: `comment-${entry.id}` });
    setReply((current) => ({ ...current, active: false }));
    return {
      accepted: true,
      message: "已加入本页预览。这条留言没有发布到网站。",
    };
  }
  return (
    <>
      <section
        id="comments"
        className="surface comments-card"
        tabIndex={-1}
        aria-labelledby="comments-title"
      >
        <header className="comments-header">
          <div>
            <h2 id="comments-title">
              <Icon name="comment" />
              <UiText text="篝火旁的声音" />
            </h2>
            <p>
              {comments.length} <UiText text="条历史留言" />
              {examples && open ? ` · ${exampleComments.length} 条示例` : ""}
              {local.length ? ` · ${local.length} 条本页留言` : ""}
            </p>
          </div>
          {open && interactive && (
            <TextLink
              href="#comment-composer"
              className="comments-write"
              onClick={(event) => {
                if (
                  !event.ctrlKey &&
                  !event.metaKey &&
                  !event.shiftKey &&
                  !event.altKey &&
                  !event.button
                ) {
                  event.preventDefault();
                  setTarget({ id: "comment-composer" });
                }
              }}
            >
              <Icon name="edit" />
              <UiText text="写留言" />
            </TextLink>
          )}
        </header>
        {!interactive ? (
          <p className="comments-demo-note">
            <UiText text="预览模式下无法提交评论。" />
          </p>
        ) : open && !contentId ? (
          <div className="comments-demo-note">
            <span>
              <span className="preview-badge">
                <UiText text="效果预览" />
              </span>
              <UiText text="历史留言保留原文，示例人物与对话均为虚构。" />
            </span>
            <Button
              type="button"
              aria-pressed={examples}
              onClick={() => {
                setExamples(!examples);
                setRequestedPage(1);
              }}
            >
              {examples ? (
                <UiText text="隐藏示例" />
              ) : (
                <UiText text="显示示例" />
              )}
            </Button>
          </div>
        ) : !open ? (
          <p className="comments-demo-note">
            <UiText text="评论已关闭，已有留言仍可阅读。" />
          </p>
        ) : null}
        <div className="comment-view-options" aria-label="留言浏览方式">
          <Button
            type="button"
            aria-pressed={!continuous}
            onClick={() => {
              setContinuous(false);
              setRequestedPage(1);
              setTarget(null);
            }}
          >
            <UiText text="分页阅读" />
          </Button>
          <Button
            type="button"
            aria-pressed={continuous}
            onClick={() => {
              setContinuous(true);
              setRequestedPage(1);
              setTarget(null);
            }}
          >
            <UiText text="连续阅读" />
          </Button>
        </div>
        <ol className="comment-list">
          {shown.map((entry, index) => (
            <CommentItem
              key={entry.id}
              entry={entry}
              entries={entries}
              path={path}
              floor={
                (continuous ? 0 : (page - 1) * COMMENT_PAGE_SIZE) + index + 1
              }
              liked={likes.get(entry.id)?.liked ?? false}
              likeCount={likes.get(entry.id)?.count}
              liking={likes.pending.has(entry.id)}
              interactive={interactive}
              onLike={() => {
                void likes.toggle(entry.id);
              }}
              onReply={
                open && interactive
                  ? () => {
                      setReply({ entry, active: true });
                      setTarget({ id: "comment-composer" });
                    }
                  : undefined
              }
              onLocate={locate}
            />
          ))}
        </ol>
        {!shown.length && (
          <div className="comment-empty">
            <Icon name="campfire" />
            <p>
              <UiText text="这里还很安静，等你来添一束光。" />
            </p>
          </div>
        )}
        {continuous && page < pages && (
          <Button
            className="comment-load-more"
            type="button"
            onClick={() => {
              setRequestedPage(page + 1);
              setTarget(null);
            }}
          >
            <UiText text="再看看更多留言 ·" />
            {entries.length - shown.length} <UiText text="条" />
          </Button>
        )}
        {!continuous && pages > 1 && (
          <nav className="comment-pagination" aria-label="评论分页">
            <Button
              type="button"
              disabled={page <= 1}
              onClick={() => {
                setRequestedPage(page - 1);
                setTarget({ id: "comments" });
              }}
            >
              <UiText text="上一页" />
            </Button>
            <span>
              <UiText text="第" />
              {page} / {pages} <UiText text="页" />
            </span>
            <Button
              type="button"
              disabled={page >= pages}
              onClick={() => {
                setRequestedPage(page + 1);
                setTarget({ id: "comments" });
              }}
            >
              <UiText text="下一页" />
            </Button>
          </nav>
        )}
      </section>
      {open && interactive && (
        <CommentComposer
          captcha={contentId ? captcha : undefined}
          reply={reply.entry}
          replying={reply.active}
          signedInName={signedInName}
          onCancelReply={() =>
            setReply((current) => ({ ...current, active: false }))
          }
          onAdd={add}
        />
      )}
    </>
  );
}
