"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "@/core/browser/crypto";
import {
  createCaptchaChallenge,
  type CaptchaAnswer,
  type CaptchaChallenge,
  type ChallengeRequest,
} from "@/core/contracts/captcha";
import { RequestError } from "@/core/http/request";

export function captchaFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 40386) return "请先完成验证码。";
    if (error.code === 40387) return "验证码不正确或已过期，请重新验证。";
    if (error.code === 40986) return "验证规则或内容已更新，请重新验证。";
    if (error.status === 429) return "验证码请求较多，请稍后重试。";
    if (error.status === 404) return "内容已不可用，请刷新页面。";
  }
  return "暂时无法完成验证，请刷新验证码后重试。";
}

/** Challenges, answers and protected reads remain component-owned memory. */
export function useCaptcha(
  baseUrl: string,
  action: ChallengeRequest["action"],
  contentId?: string,
  enabled = true,
  { lazy = false }: { lazy?: boolean } = {},
) {
  const [clientId] = useState(randomUUID);
  const [challenge, setChallenge] = useState<CaptchaChallenge | null>(null);
  const [answer, setAnswer] = useState("");
  const [pending, setPending] = useState(!lazy && enabled);
  const [error, setError] = useState("");
  const request = useRef<AbortController | null>(null);
  const prepare = useCallback(async () => {
    if (!enabled) throw new RequestError("cancelled");
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setAnswer("");
    setError("");
    try {
      const response = await createCaptchaChallenge(
        baseUrl,
        { action, content_id: contentId, client_id: clientId },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) throw new RequestError("cancelled");
      setChallenge(response.data);
      return response.data;
    } catch (reason) {
      if (!controller.signal.aborted) {
        setChallenge(null);
        setError(captchaFailure(reason));
      }
      throw reason;
    } finally {
      if (!controller.signal.aborted) setPending(false);
    }
  }, [baseUrl, action, contentId, clientId, enabled]);
  const refresh = useCallback(async () => {
    try {
      return await prepare();
    } catch {
      // Existing inline widgets render the controller error rather than reject.
      return undefined;
    }
  }, [prepare]);
  const reset = useCallback(() => {
    request.current?.abort();
    setChallenge(null);
    setAnswer("");
    setPending(false);
    setError("");
  }, []);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed && !lazy && enabled) void refresh();
    });
    return () => {
      disposed = true;
      request.current?.abort();
    };
  }, [refresh, lazy, enabled]);
  useEffect(() => {
    if (!enabled || !challenge?.required) return;
    const timer = setTimeout(
      () => void refresh(),
      (challenge.expires_in ?? 180) * 1000,
    );
    return () => clearTimeout(timer);
  }, [challenge, refresh, enabled]);
  const response: CaptchaAnswer | undefined =
    challenge?.required &&
    challenge.challenge_id &&
    answer.trim() &&
    (challenge.provider !== "local" || answer.trim().length === 5)
      ? {
          challenge_id: challenge.challenge_id,
          client_id: clientId,
          answer: answer.trim(),
        }
      : undefined;
  return {
    clientId,
    challenge,
    answer,
    setAnswer,
    pending,
    error,
    setError,
    refresh,
    /** Explicit demand loading rejects failures; an absent challenge is never a pass. */
    prepare,
    /** Dismissed challenges and answers do not survive in the background. */
    reset,
    response,
    ready:
      enabled &&
      !pending &&
      !error &&
      !!challenge &&
      (!challenge.required || !!response),
  };
}
export type CaptchaController = ReturnType<typeof useCaptcha>;
