"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
export class InvalidUpload extends Error {}
export interface LibraryAdapter<T, P> {
  read: (
    base: string,
    query: string,
    page: number,
    kind: string,
    csrf: string,
    signal: AbortSignal,
  ) => Promise<{ items: T[]; total: number }>;
  prepare: (file: File, kind: string) => Promise<P>;
  write: (base: string, payload: P, csrf: string) => Promise<T>;
  unavailable: string;
  rejected: string;
}
/** Shared lifecycle for the icon library and filtered image/video pickers. */
export function useAssetLibrary<T, P>(
  adapter: LibraryAdapter<T, P>,
  kind = "all",
) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [items, setItems] = useState<T[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadRetryable, setUploadRetryable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [lastUploaded, setLastUploaded] = useState<T | null>(null);
  const pending = useRef<P | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await adapter.read(
          baseUrl,
          query,
          page,
          kind,
          csrfToken,
          abort.signal,
        );
        if (!abort.signal.aborted) {
          setQueryError("");
          setItems(result.items);
          setTotal(result.total);
        }
      } catch {
        if (!abort.signal.aborted) setQueryError(adapter.unavailable);
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [adapter, baseUrl, csrfToken, query, page, kind, refresh]);
  const send = useCallback(
    async (payload: P) => {
      setUploading(true);
      setUploadError("");
      setUploadRetryable(false);
      try {
        const result = await adapter.write(baseUrl, payload, csrfToken);
        if (mounted.current) {
          pending.current = null;
          setLastUploaded(result);
          setPage(1);
          setQuery("");
          setRefresh((v) => v + 1);
        }
      } catch (error) {
        if (mounted.current) {
          const rejected =
            error instanceof RequestError &&
            [413, 415, 422].includes(error.status ?? 0);
          setUploadRetryable(!rejected);
          if (rejected) pending.current = null;
          setUploadError(
            rejected
              ? adapter.rejected
              : "尚未确认上传结果，可以重试；同一次上传不会重复入库。",
          );
        }
      } finally {
        if (mounted.current) setUploading(false);
      }
    },
    [adapter, baseUrl, csrfToken],
  );
  const upload = async (file: File) => {
    pending.current = null;
    setUploadRetryable(false);
    setLastUploaded(null);
    setUploading(true);
    setUploadError("");
    try {
      const payload = await adapter.prepare(file, kind);
      if (!mounted.current) return;
      pending.current = payload;
      await send(payload);
    } catch (error) {
      if (mounted.current) {
        setUploadError(
          error instanceof InvalidUpload
            ? error.message
            : "无法读取所选文件，请重新选择。",
        );
        setUploading(false);
      }
    }
  };
  return {
    items,
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setPage(1);
    },
    page,
    setPage,
    total,
    loading,
    uploading,
    error: uploadError || queryError,
    canRetry: uploadRetryable || (!uploadError && Boolean(queryError)),
    lastUploaded,
    upload,
    retry: () =>
      pending.current ? send(pending.current) : setRefresh((v) => v + 1),
  };
}
