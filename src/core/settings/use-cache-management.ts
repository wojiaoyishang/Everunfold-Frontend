"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  pruneNodeCache,
  readFrontendNodes,
  readNodeCache,
  rebuildNodeCache,
  saveCachePolicy,
  type CacheNodeState,
  type CachePolicy,
  type CacheRebuild,
  type PolicyState,
} from "@/core/contracts/settings";
import { RequestError } from "@/core/http/request";
import { settingsFailure } from "./editor";

type Action = CacheRebuild["scope"] | "prune";
type PolicyDraft = { base: PolicyState; value: CachePolicy };

export function useCacheManagement(localNode: string) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [nodes, setNodes] = useState<PolicyState[] | null>(null);
  const [drafts, setDrafts] = useState(() => new Map<string, PolicyDraft>());
  const [policyNotice, setPolicyNotice] = useState<{
    type: "saved" | "error";
    text: string;
  }>();
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
  const [busy, setBusy] = useState<Action | "policy">();
  const [watch, setWatch] = useState(0);
  const policy =
    nodes?.find((item) => item.node_id === selected) ??
    nodes?.find((item) => item.node_id === localNode) ??
    nodes?.[0];
  const node = policy?.node_id ?? "";
  const draft = drafts.get(node);
  const policyConflict = Boolean(
    draft &&
    policy &&
    (draft.base.revision !== policy.revision ||
      draft.base.source_epoch !== policy.source_epoch),
  );
  const state = snapshot?.node_id === node ? snapshot : undefined;

  const loadNodes = useCallback(async () => {
    listing.current?.abort();
    const request = new AbortController();
    listing.current = request;
    const { signal } = request;
    setListError(false);
    try {
      const response = await readFrontendNodes(baseUrl, { signal });
      if (!signal.aborted) setNodes(response.data.nodes);
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

  function resetPolicy() {
    setDrafts((current) => {
      const next = new Map(current);
      next.delete(node);
      return next;
    });
    setPolicyNotice(undefined);
  }

  function updatePolicy(change: Partial<CachePolicy>) {
    if (!policy || operation.current) return;
    setPolicyNotice(undefined);
    setDrafts((current) => {
      const previous = current.get(node);
      const base = previous?.base ?? policy;
      const value = { ...base.value, ...previous?.value, ...change };
      const next = new Map(current);
      if (JSON.stringify(base.value) === JSON.stringify(value))
        next.delete(node);
      else next.set(node, { base, value });
      return next;
    });
  }

  async function run(action: Action | PolicyDraft) {
    if (!node || operation.current) return false;
    const request = new AbortController();
    operation.current = request;
    const savingPolicy = typeof action !== "string";
    setBusy(savingPolicy ? "policy" : action);
    if (savingPolicy) {
      setPolicyNotice(undefined);
    } else {
      setActionError("");
      setResult(undefined);
    }
    try {
      if (savingPolicy) {
        const { data } = await saveCachePolicy(
          baseUrl,
          node,
          { expected_revision: action.base.revision, value: action.value },
          csrfToken,
          { signal: request.signal },
        );
        if (request.signal.aborted) return false;
        // An earlier list request must not replace the revision just saved.
        listing.current?.abort();
        setNodes(
          (current) =>
            current?.map((item) => (item.node_id === node ? data : item)) ??
            null,
        );
        resetPolicy();
        setPolicyNotice({ type: "saved", text: "节点策略已保存。" });
        setWatch((value) => value + 1);
      } else if (action === "prune") {
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
        if (savingPolicy) {
          setPolicyNotice({ type: "error", text: settingsFailure(error) });
          if (error instanceof RequestError && error.status === 409)
            void loadNodes();
        } else {
          setActionError(
            error instanceof RequestError && error.status === 403
              ? "当前账号无权管理缓存。"
              : "未能确认操作结果，请刷新状态后重试。",
          );
        }
        void refresh();
      }
      return false;
    } finally {
      if (operation.current === request) {
        operation.current = null;
        if (!request.signal.aborted) setBusy(undefined);
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
    busy: busy !== undefined,
    result,
    run: (action: Action) => run(action),
    policy: {
      value: draft?.value ?? policy?.value,
      dirty: Boolean(draft),
      hasChanges: drafts.size > 0,
      conflict: policyConflict,
      saving: busy === "policy",
      notice: policyNotice,
      update: updatePolicy,
      reset: resetPolicy,
      save: () => {
        if (draft && !policyConflict) void run(draft);
      },
    },
    reloadNodes: () => void loadNodes(),
    refresh: () => {
      void loadNodes();
      void refresh();
    },
    clearActionError: () => setActionError(""),
    select: (id: string) => {
      setResult(undefined);
      setReadError(false);
      setPolicyNotice(undefined);
      select(id);
    },
  };
}
