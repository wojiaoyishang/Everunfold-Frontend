"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { readProtectedContent } from "@/core/contracts/content-access";
import type { ContentDetail } from "@/core/contracts/content-access";
import { RequestError } from "@/core/http/request";

/** Restricted data lives only in this mounted page; never register it in shared reader caches. */
export function useProtectedContent(
  baseUrl: string,
  id: string,
  opensAt?: string | null,
) {
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const inFlight = useRef<AbortController | null>(null);
  const load = useCallback(
    async (password = "") => {
      if (inFlight.current) return false;
      const abort = new AbortController();
      inFlight.current = abort;
      setPending(true);
      setError("");
      try {
        const response = await readProtectedContent(
          baseUrl,
          { id, password },
          { signal: abort.signal },
        );
        if (abort.signal.aborted) return false;
        setContent(response.data);
        return true;
      } catch (reason) {
        if (!abort.signal.aborted)
          setError(
            reason instanceof RequestError && reason.status === 403
              ? "密码不正确，或内容尚未到开放时间。"
              : reason instanceof RequestError && reason.status === 429
                ? "尝试较多，请稍后再试。"
                : "暂时无法获取正文，请稍后重试。",
          );
        return false;
      } finally {
        if (!abort.signal.aborted) setPending(false);
        inFlight.current = null;
      }
    },
    [baseUrl, id],
  );
  useEffect(() => {
    if (!opensAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const check = () => {
      const remaining = Date.parse(opensAt) - Date.now();
      if (remaining > 0)
        timer = setTimeout(check, Math.min(remaining + 500, 2147483647));
      else void load();
    };
    check();
    return () => clearTimeout(timer);
  }, [opensAt, load]);
  useEffect(
    () => () => {
      inFlight.current?.abort();
    },
    [],
  );
  return { content, pending, error, load };
}
