"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure } from "@/core/accounts/use-action";
import {
  queryComments,
  readWorkspace,
  type CommentQuery,
  type ModerationCatalog,
  type WorkspaceSummary,
} from "@/core/contracts/operations";

function useOperationalQuery<T>(
  load: (signal: AbortSignal) => Promise<{ data: T }>,
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError("");
    try {
      const response = await load(controller.signal);
      if (!controller.signal.aborted) setData(response.data);
    } catch (reason) {
      if (!controller.signal.aborted) setError(accountFailure(reason));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [load]);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void refresh();
    });
    return () => {
      disposed = true;
      active.current?.abort();
    };
  }, [refresh]);
  return { data, loading, error, refresh };
}
export function useWorkspace() {
  const { baseUrl } = useAdminRequest();
  const load = useCallback(
    (signal: AbortSignal) => readWorkspace(baseUrl, { signal }),
    [baseUrl],
  );
  return useOperationalQuery<WorkspaceSummary>(load);
}
export function useModeration(query: CommentQuery) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const load = useCallback(
    (signal: AbortSignal) =>
      queryComments(baseUrl, query, csrfToken, { signal }),
    [baseUrl, csrfToken, query],
  );
  return useOperationalQuery<ModerationCatalog>(load);
}
