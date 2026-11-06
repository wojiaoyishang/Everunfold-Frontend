import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  readCommentLikes,
  setCommentLike,
} from "@/core/contracts/comment-likes";
import { RequestError } from "../src/core/http/request";
import {
  emptyReaderSnapshot,
  readerProgress,
  readerPhase,
} from "../src/core/reader/state";
import { NavigationTransaction } from "../src/core/navigation/transaction";
import { NavigationLoadError } from "../src/core/navigation/document";
import { failureDocument } from "../src/themes/argon/failure/document";
import { CommentItem } from "../src/themes/argon/components/comments/comment-item";
import type { CommentEntry } from "../src/themes/argon/components/comments/model";

const id = "00000000-0000-4000-8000-000000000001";
const visitor = "00000000-0000-4000-8000-000000000002";
const envelope = (data: object) => ({
  success: true,
  code: 200,
  msg: "ok",
  data,
});

test("comment writes await a valid explicit ACK and are not automatically retried", async () => {
  const response = await setCommentLike(
    "https://backend.test",
    id,
    { liked: true },
    visitor,
    {
      fetcher: async (url, options) => {
        assert.equal(new URL(String(url)).pathname, `/v1/comments/${id}/like`);
        assert.equal(options?.method, "PUT");
        assert.equal(options?.credentials, "omit");
        assert.equal(options?.cache, "no-store");
        assert.equal(
          new Headers(options?.headers).get("X-Everunfold-Visitor"),
          visitor,
        );
        assert.deepEqual(JSON.parse(String(options?.body)), { liked: true });
        return Response.json(
          envelope({ comment_id: id, liked: true, count: 1 }),
        );
      },
    },
  );
  assert.equal(response.data.count, 1);
  let attempts = 0;
  await assert.rejects(
    setCommentLike("https://backend.test", id, { liked: false }, visitor, {
      fetcher: async () => {
        attempts++;
        throw new TypeError("offline");
      },
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "network",
  );
  assert.equal(attempts, 1);
  await assert.rejects(
    setCommentLike("https://backend.test", id, { liked: true }, visitor, {
      fetcher: async () =>
        Response.json({ success: false, code: 200, data: { liked: true } }),
    }),
    RequestError,
  );
  await assert.rejects(
    readCommentLikes("https://backend.test", { ids: [id] }, visitor, {
      fetcher: async () => new Response("down", { status: 503 }),
    }),
    (error: unknown) => error instanceof RequestError && error.status === 503,
  );
});

test("a stalled write response body times out and cancellation is distinct from failure", async () => {
  let aborted = false;
  await assert.rejects(
    setCommentLike("https://backend.test", id, { liked: true }, visitor, {
      timeoutMs: 5,
      fetcher: async (_url, options) =>
        new Response(
          new ReadableStream({
            start(controller) {
              options?.signal?.addEventListener("abort", () => {
                aborted = true;
                controller.error(new Error("aborted"));
              });
            },
          }),
        ),
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "timeout",
  );
  assert.equal(aborted, true);
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    setCommentLike("https://backend.test", id, { liked: true }, visitor, {
      signal: controller.signal,
      fetcher: async () => {
        throw new Error("must not fetch");
      },
    }),
    (error: unknown) =>
      error instanceof RequestError && error.kind === "cancelled",
  );
});

test("page request progress reflects settlement across endpoints without calling failures success", () => {
  assert.deepEqual(readerProgress(emptyReaderSnapshot), {
    total: 0,
    settled: 0,
    failed: 0,
    fraction: 0,
  });
  const state = {
    ...emptyReaderSnapshot,
    requests: {
      a: { status: "ready", value: 0 },
      b: { status: "loading" },
      c: { status: "error", reason: "offline" },
    },
  } as typeof emptyReaderSnapshot;
  assert.equal(readerProgress(state).fraction, 2 / 3);
  assert.equal(readerPhase(state), "updating");
  state.requests.b = { status: "error", reason: "timeout" };
  assert.equal(readerProgress(state).fraction, 1);
  assert.equal(readerProgress(state).failed, 2);
  assert.equal(readerPhase(state), "partial");
});

test("known article failures surface sync feedback while a real missing URL stays 404", async () => {
  for (const expectedContent of [true, false]) {
    const transaction = new NavigationTransaction({
      prepare: async () => {
        throw new NavigationLoadError("not-found");
      },
      commit: () => assert.fail("must keep current page"),
      abandon: () => {},
    });
    transaction.start({
      href: "/article.html",
      origin: "https://blog.test/",
      expectedContent,
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    assert.equal(
      transaction.getSnapshot().failure,
      expectedContent ? "sync" : "not-found",
    );
    transaction.cancel();
  }
  assert.match(failureDocument(404), /404 页面未找到/);
  assert.match(failureDocument(503), /后端同步失败/);
  assert.doesNotMatch(failureDocument(404), /故事|展开|data-page-ready/);
});

test("comment pending state prevents duplicate clicks and does not show an optimistic like", () => {
  const entry: CommentEntry = {
    id,
    parentId: null,
    author: "Test",
    body: "Comment",
    createdAt: "2026-10-31T00:00:00Z",
    origin: "history",
    format: "plain",
  };
  const html = renderToStaticMarkup(
    createElement(CommentItem, {
      entry,
      entries: [entry],
      path: "/article.html",
      floor: 1,
      liked: false,
      liking: true,
      onLike() {},
      onReply() {},
      onLocate() {},
    }),
  );
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /disabled/);
  assert.match(html, /提交中/);
  assert.doesNotMatch(html, /已赞同/);
});
