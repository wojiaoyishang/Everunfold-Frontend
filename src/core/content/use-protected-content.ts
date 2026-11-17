"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  readProtectedContent,
  resumeProtectedArticle,
  type ContentDetail,
} from "@/core/contracts/content-access";
import { RequestError } from "@/core/http/request";
import type { CaptchaAnswer } from "@/core/contracts/captcha";
import { captchaFailure } from "@/core/captcha/use-captcha";
import {
  articleReadHeaders,
  forgetArticleRead,
  rememberArticleRead,
  unavailableArticleRead,
  useRememberedArticleRead,
} from "./remembered-article";

/** Protected bodies remain in the mounted page, including reads restored from a receipt. */
export function useProtectedContent(
  baseUrl: string,
  id: string,
  {
    opensAt,
    captchaRequired = false,
    remember = false,
  }: { opensAt?: string | null; captchaRequired?: boolean; remember?: boolean },
) {
  const [reading, setReading] = useState<{
    data: ContentDetail;
    baseUrl: string;
    remembered: boolean;
  } | null>(null);
  const [failedReceipt, setFailedReceipt] = useState<string | null>(null);
  const receipt = useRememberedArticleRead(baseUrl, remember ? id : undefined);
  const content =
    reading?.baseUrl === baseUrl &&
    reading.data.id === id &&
    (!reading.remembered || reading.data.read_receipt === receipt)
      ? reading.data
      : null;
  const restoring = Boolean(receipt && receipt !== failedReceipt && !content);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef<AbortController | null>(null);
  const load = useCallback(
    async (password = "", captcha?: CaptchaAnswer) => {
      if (inFlight.current) return false;
      const abort = new AbortController();
      inFlight.current = abort;
      const requestedAt = Date.now();
      setPending(true);
      setError("");
      try {
        const response = await readProtectedContent(
          baseUrl,
          { id, password, captcha },
          { signal: abort.signal },
        );
        if (abort.signal.aborted) return false;
        if (response.data.id !== id) throw new RequestError("invalid");
        const remembered =
          Boolean(password) &&
          remember &&
          rememberArticleRead(
            baseUrl,
            id,
            response.data.read_receipt,
            requestedAt,
          );
        setReading({ data: response.data, baseUrl, remembered });
        return true;
      } catch (reason) {
        if (!abort.signal.aborted)
          setError(
            reason instanceof RequestError &&
              [40386, 40387, 40986, 50386, 42986].includes(reason.code ?? 0)
              ? captchaFailure(reason)
              : reason instanceof RequestError && reason.status === 403
                ? "密码不正确，或内容尚未到开放时间。"
                : reason instanceof RequestError && reason.status === 429
                  ? "尝试较多，请稍后再试。"
                  : "暂时无法获取正文，请稍后重试。",
          );
        return false;
      } finally {
        if (!abort.signal.aborted) setPending(false);
        if (inFlight.current === abort) inFlight.current = null;
      }
    },
    [baseUrl, id, remember],
  );

  useEffect(() => {
    if (!receipt || !restoring) return;
    const abort = new AbortController();
    void resumeProtectedArticle(
      baseUrl,
      { id },
      { signal: abort.signal, headers: articleReadHeaders(receipt) },
    )
      .then(({ data }) => {
        if (abort.signal.aborted) return;
        if (data.id !== id || data.read_receipt !== receipt)
          throw new RequestError("invalid");
        setReading({ data, baseUrl, remembered: true });
      })
      .catch((reason: unknown) => {
        if (abort.signal.aborted) return;
        setFailedReceipt(receipt);
        if (unavailableArticleRead(reason))
          forgetArticleRead(baseUrl, id, receipt);
      });
    return () => abort.abort();
  }, [baseUrl, id, receipt, restoring]);

  useEffect(() => {
    if (!opensAt || captchaRequired || content || restoring) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = Date.parse(opensAt) - Date.now();
      if (remaining > 0)
        timer = setTimeout(check, Math.min(remaining + 500, 2147483647));
      else void load();
    };
    check();
    return () => clearTimeout(timer);
  }, [opensAt, load, captchaRequired, content, restoring]);
  useEffect(
    () => () => {
      inFlight.current?.abort();
      inFlight.current = null;
    },
    [baseUrl, id],
  );
  return { content, pending: pending || restoring, restoring, error, load };
}
