"use client";
import { useRef } from "react";
import { usePublicAccount } from "@/core/auth/use-public-account";
import { randomUUID } from "@/core/browser/crypto";
import { useCaptcha } from "@/core/captcha/use-captcha";
import {
  readPageComments,
  submitAccountReaderComment,
  submitReaderComment,
  type SubmitComment,
} from "@/core/contracts/captcha";
import { RequestError, type RequestOptions } from "@/core/http/request";
import { usePageComments } from "./comments";

export type PageCommentInput = Pick<
  SubmitComment,
  "author" | "body" | "parent_id" | "format" | "website"
>;

/** Custom UIs share the host's target, CAPTCHA and protected reading grant. */
export function usePageCommentClient() {
  const context = usePageComments();
  const { baseUrl, pageId, open, preview, readReceipt } = context;
  const { state } = usePublicAccount(baseUrl);
  const session =
    state.phase === "ready" && state.session.authenticated
      ? state.session
      : null;
  const captcha = useCaptcha(baseUrl, "comment", pageId, open && !preview);
  const operation = useRef<{ fingerprint: string; id: string } | null>(null);
  return {
    ...context,
    captcha,
    canSubmit: open && !preview && captcha.ready,
    read(page = 1, pageSize = 50, options: RequestOptions = {}) {
      if (preview) return Promise.reject(new RequestError("http", 403));
      return readPageComments(
        baseUrl,
        { id: pageId, page, page_size: pageSize, read_receipt: readReceipt },
        options,
      );
    },
    async submit(input: PageCommentInput, options: RequestOptions = {}) {
      if (preview || !open) throw new RequestError("http", 403);
      const fingerprint = JSON.stringify({
        ...input,
        pageId,
        user: session?.user?.id,
      });
      if (operation.current?.fingerprint !== fingerprint)
        operation.current = { fingerprint, id: randomUUID() };
      try {
        const comment = {
          ...input,
          operation_id: operation.current.id,
          content_id: pageId,
          client_id: captcha.clientId,
          captcha: captcha.response,
          read_receipt: readReceipt,
        };
        const result = session
          ? await submitAccountReaderComment(
              baseUrl,
              comment,
              session.csrf_token,
              options,
            )
          : await submitReaderComment(baseUrl, comment, options);
        operation.current = null;
        return result;
      } finally {
        void captcha.refresh();
      }
    },
  };
}
