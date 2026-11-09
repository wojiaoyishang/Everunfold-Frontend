"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { commentReadHeaders } from "@/core/content/comment-read-grant";
import { visitorId } from "@/core/browser/visitor";
import { RequestError, type RequestOptions } from "@/core/http/request";
import {
  readCommentLikes,
  setCommentLike,
} from "@/core/contracts/comment-likes";
import type { CommentLikesContract } from "@/core/contracts/comment-likes";
import { usePageRequest, useReaderData } from "../reader-data";
import { useFeedback } from "../ui/feedback";

type LikeState = CommentLikesContract["state"]["data"];

export function useCommentLikes(
  ids: string[],
  contentId?: string,
  readReceipt?: string,
) {
  const idsKey = ids.join(",");
  const { store } = useReaderData();
  const notify = useFeedback();
  const [confirmed, setConfirmed] = useState<Record<string, LikeState>>({});
  const [pending, setPending] = useState<Set<string>>(() => new Set());
  const controllers = useRef(new Map<string, AbortController>());
  useEffect(() => {
    const active = controllers.current;
    return () => {
      for (const controller of active.values()) controller.abort();
      active.clear();
    };
  }, []);
  const load = useCallback(
    async (options: RequestOptions) => {
      const requested = idsKey.split(",").filter(Boolean);
      const batches = [];
      for (let offset = 0; offset < requested.length; offset += 50) {
        batches.push(
          readCommentLikes(
            store.baseUrl,
            { ids: requested.slice(offset, offset + 50) },
            visitorId(store.baseUrl),
            {
              ...options,
              headers: {
                ...options.headers,
                ...commentReadHeaders(contentId, readReceipt),
              },
            },
          ),
        );
      }
      const result = {
        data: {
          items: (await Promise.all(batches)).flatMap(
            (response) => response.data.items,
          ),
        },
      };
      const seen = new Set<string>();
      for (const item of result.data.items) {
        if (seen.has(item.comment_id) || !requested.includes(item.comment_id))
          throw new RequestError("invalid");
        seen.add(item.comment_id);
      }
      return result.data;
    },
    [idsKey, store, contentId, readReceipt],
  );
  const request = usePageRequest(
    idsKey ? `comments:likes:${idsKey}` : null,
    load,
  );
  const get = (id: string) =>
    confirmed[id] ??
    (request?.status === "ready"
      ? request.value.items.find((item) => item.comment_id === id)
      : undefined);
  async function toggle(id: string) {
    if (controllers.current.has(id)) return;
    const desired = !get(id)?.liked;
    const controller = new AbortController();
    controllers.current.set(id, controller);
    setPending(new Set(controllers.current.keys()));
    try {
      if (navigator.onLine === false) throw new RequestError("network");
      const response = await setCommentLike(
        store.baseUrl,
        id,
        { liked: desired },
        visitorId(store.baseUrl),
        {
          signal: controller.signal,
          headers: commentReadHeaders(contentId, readReceipt),
        },
      );
      if (response.data.comment_id !== id || response.data.liked !== desired)
        throw new RequestError("invalid");
      if (controller.signal.aborted) return;
      // A slower initial GET cannot undo a newer confirmed write.
      setConfirmed((current) => ({ ...current, [id]: response.data }));
      notify(desired ? "已赞同这条留言" : "已取消赞同");
    } catch (error) {
      if (controller.signal.aborted) return;
      notify(
        error instanceof RequestError && error.code === 40388
          ? "阅读验证已过期，请刷新页面并重新解锁。"
          : error instanceof RequestError && error.status === 404
            ? "这条留言暂时无法点赞，请刷新后重试。"
            : navigator.onLine === false
              ? "当前网络离线，点赞未发送。"
              : "点赞未能确认，请检查网络后重试。",
        "error",
      );
    } finally {
      controllers.current.delete(id);
      if (!controller.signal.aborted)
        setPending(new Set(controllers.current.keys()));
    }
  }
  return { get, pending, toggle };
}
