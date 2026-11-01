"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import type { CachePolicy, PolicyState } from "@/generated/settings-contract";
import {
  readFrontendNodes,
  saveCachePolicy,
  retrySettingsSync,
} from "@/generated/settings-client";
import { settingsFailure } from "./editor";

export function useFrontendNodes() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [nodes, setNodes] = useState<PolicyState[]>([]);
  const [drafts, setDrafts] = useState<Record<string, CachePolicy>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const refresh = useCallback(
    async (replaceDrafts = false, silent = false) => {
      try {
        const response = await readFrontendNodes(baseUrl);
        if (!mounted.current) return;
        setNodes((current) =>
          response.data.nodes.map((row) => {
            const previous = current.find(
              (node) => node.node_id === row.node_id,
            );
            return previous &&
              !replaceDrafts &&
              previous.revision !== row.revision
              ? previous
              : row;
          }),
        );
        setDrafts((current) =>
          Object.fromEntries(
            response.data.nodes.map((node) => [
              node.node_id,
              replaceDrafts
                ? node.value
                : (current[node.node_id] ?? node.value),
            ]),
          ),
        );
        if (!silent) setError("");
      } catch {
        if (mounted.current && !silent)
          setError("暂时无法读取节点状态，请稍后重试。");
      } finally {
        if (mounted.current) setLoading(false);
      }
    },
    [baseUrl],
  );
  useEffect(() => {
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) void refresh();
    });
    return () => {
      disposed = true;
    };
  }, [refresh]);
  const pending = nodes.some(
    (row) =>
      row.delivery.status === "pending" || row.delivery.status === "failed",
  );
  const versions = nodes
    .map((node) => `${node.node_id}:${node.revision}`)
    .join(",");
  useEffect(() => {
    if (!pending) return;
    let count = 0;
    const timer = setInterval(() => {
      if (++count > 30) clearInterval(timer);
      else void refresh(false, true);
    }, 2000);
    return () => clearInterval(timer);
  }, [pending, versions, refresh]);
  async function save(node: PolicyState) {
    if (busy || !drafts[node.node_id]) return;
    setBusy(node.node_id);
    setError("");
    setMessage("");
    try {
      const response = await saveCachePolicy(
        baseUrl,
        node.node_id,
        { expected_revision: node.revision, value: drafts[node.node_id] },
        csrfToken,
      );
      if (!mounted.current) return;
      setNodes((current) =>
        current.map((item) =>
          item.node_id === node.node_id ? response.data : item,
        ),
      );
      setDrafts((current) => ({
        ...current,
        [node.node_id]: response.data.value,
      }));
      setMessage("策略已保存，节点确认后会显示为已应用。");
    } catch (error) {
      if (mounted.current) setError(settingsFailure(error));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }
  async function retry(nodeId: string) {
    if (busy) return;
    setBusy(nodeId);
    setError("");
    try {
      await retrySettingsSync(baseUrl, nodeId, csrfToken);
      await refresh();
      setMessage("已安排重新同步，不会修改已保存的设置。");
    } catch (error) {
      if (mounted.current) setError(settingsFailure(error));
    } finally {
      if (mounted.current) setBusy(null);
    }
  }
  return {
    nodes,
    drafts,
    setDrafts,
    loading,
    busy,
    error,
    message,
    refresh,
    save,
    retry,
  };
}
