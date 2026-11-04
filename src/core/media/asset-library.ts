"use client";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import type { RequestOptions } from "@/core/http/request";
import { UploadQueue } from "./upload-queue";
export { InvalidUpload } from "./upload-queue";
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
  write: (
    base: string,
    payload: P,
    csrf: string,
    options: RequestOptions,
  ) => Promise<T>;
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
  const [loading, setLoading] = useState(true);
  const [queryError, setQueryError] = useState("");
  const [refresh, setRefresh] = useState(0);
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
  const queue = useMemo(
    () =>
      new UploadQueue<T, P>({
        prepare: adapter.prepare,
        send: (payload, signal, onUploadProgress) =>
          adapter.write(baseUrl, payload, csrfToken, {
            signal,
            onUploadProgress,
          }),
        completed: () => {
          setRefresh((v) => v + 1);
        },
        rejected: adapter.rejected,
      }),
    [adapter, baseUrl, csrfToken],
  );
  useEffect(() => {
    queue.start();
    return () => queue.dispose();
  }, [queue]);
  const uploads = useSyncExternalStore(
    queue.subscribe,
    queue.snapshot,
    queue.snapshot,
  );
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
    error: queryError,
    canRetry: Boolean(queryError),
    refresh: () => setRefresh((v) => v + 1),
    retry: () => setRefresh((v) => v + 1),
    queue,
    uploads,
    upload: (files: File[]) => queue.add(files, kind),
  };
}
