"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  pruneNodeCache,
  readFrontendNodes,
  readNodeCache,
  rebuildNodeCache,
  type CacheNodeState,
  type CacheRebuild,
} from "@/core/contracts/settings";
import { RequestError } from "@/core/http/request";

type Action = CacheRebuild["scope"] | "prune";

export function useCacheManagement(localNode: string) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [nodes, setNodes] = useState<string[] | null>(null);
  const [selected, select] = useState("");
  const [snapshot, setSnapshot] = useState<CacheNodeState>();
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState(false);
  const [readError, setReadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [result, setResult] = useState<
    { type: "queued" } | { type: "pruned"; files: number; bytes: number }
  >();
  const current = useRef<AbortController | null>(null);
  const listing = useRef<AbortController | null>(null);
  const operation = useRef<AbortController | null>(null);
  const [busy, setBusy] = useState(false);
  const [watch, setWatch] = useState(0);
  const node =
    nodes?.find((id) => id === selected) ??
    nodes?.find((id) => id === localNode) ??
    nodes?.[0] ??
    "";
  const state = snapshot?.node_id === node ? snapshot : undefined;

  const loadNodes = useCallback(async () => {
    listing.current?.abort();
    const request = new AbortController();
    listing.current = request;
    const { signal } = request;
    setListError(false);
    try {
      const response = await readFrontendNodes(baseUrl, { signal });
      if (!signal.aborted)
        setNodes(response.data.nodes.map((entry) => entry.node_id));
    } catch {
      if (!signal.aborted) setListError(true);
    }
  }, [baseUrl]);

  const refresh = useCallback(
    async (background = false) => {
      if (!node || (background && current.current)) return;
      current.current?.abort();
      const request = new AbortController();
      current.current = request;
      if (!background) setLoading(true);
      try {
        const response = await readNodeCache(baseUrl, node, {
          signal: request.signal,
        });
        if (!request.signal.aborted) {
          setSnapshot(response.data);
          setReadError(false);
        }
      } catch {
        if (!request.signal.aborted) setReadError(true);
      } finally {
        if (current.current === request) {
          current.current = null;
          if (!background) setLoading(false);
        }
      }
    },
    [baseUrl, node],
  );

  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void loadNodes();
    });
    return () => {
      disposed = true;
      listing.current?.abort();
    };
  }, [loadNodes]);
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void refresh();
    });
    return () => {
      disposed = true;
      current.current?.abort();
    };
  }, [refresh]);
  useEffect(() => () => operation.current?.abort(), []);
  const pending = Object.values(state?.sync ?? {}).some(
    (item) => item.state === "pending" || item.state === "retrying",
  );
  useEffect(() => {
    if (!node || !pending) return;
    let count = 0;
    const timer = window.setInterval(() => {
      if (++count > 20) window.clearInterval(timer);
      else void refresh(true);
    }, 2500);
    return () => window.clearInterval(timer);
  }, [node, pending, watch, refresh]);

  async function run(action: Action) {
    if (!node || operation.current) return false;
    const request = new AbortController();
    operation.current = request;
    setBusy(true);
    setActionError("");
    setResult(undefined);
    try {
      if (action === "prune") {
        const { data } = await pruneNodeCache(baseUrl, node, csrfToken, {
          signal: request.signal,
          timeoutMs: 12000,
        });
        if (request.signal.aborted) return false;
        setResult({
          type: "pruned",
          files: data.removed_files,
          bytes: data.removed_bytes,
        });
      } else {
        await rebuildNodeCache(baseUrl, node, { scope: action }, csrfToken, {
          signal: request.signal,
        });
        if (request.signal.aborted) return false;
        setResult({ type: "queued" });
        setWatch((value) => value + 1);
      }
      await refresh();
      return true;
    } catch (error) {
      if (!request.signal.aborted) {
        setActionError(
          error instanceof RequestError && error.status === 403
            ? "当前账号无权管理缓存。"
            : "未能确认操作结果，请刷新状态后重试。",
        );
        void refresh();
      }
      return false;
    } finally {
      if (operation.current === request) {
        operation.current = null;
        if (!request.signal.aborted) setBusy(false);
      }
    }
  }

  return {
    nodes,
    node,
    state,
    loading,
    listError,
    readError,
    actionError,
    busy,
    result,
    run,
    reloadNodes: () => void loadNodes(),
    refresh: () => void refresh(),
    clearActionError: () => setActionError(""),
    select: (id: string) => {
      setResult(undefined);
      setReadError(false);
      select(id);
    },
  };
}
