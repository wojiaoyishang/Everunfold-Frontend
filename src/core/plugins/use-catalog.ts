"use client";
import { useCallback, useEffect, useState } from "react";
import {
  readExtensions,
  type ExtensionCatalog,
} from "@/core/contracts/settings";
import { useAdminRequest } from "@/core/admin/account-context";
export function useExtensionCatalog() {
  const { baseUrl } = useAdminRequest();
  const [catalog, setCatalog] = useState<ExtensionCatalog | null>(null),
    [error, setError] = useState("");
  const reload = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const response = await readExtensions(baseUrl, { signal });
        if (!signal?.aborted) {
          setCatalog(response.data);
          setError("");
        }
      } catch {
        if (!signal?.aborted) setError("暂时无法读取部署清单，请稍后重试。");
      }
    },
    [baseUrl],
  );
  useEffect(() => {
    const controller = new AbortController();
    queueMicrotask(() => {
      if (!controller.signal.aborted) void reload(controller.signal);
    });
    const timer = setInterval(() => void reload(controller.signal), 10000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [reload]);
  const nodes = catalog?.nodes.filter((node) => node.enabled) ?? [];
  const themes =
    nodes[0]?.inventory?.themes?.filter((theme) =>
      nodes.every((node) =>
        node.inventory?.themes?.some(
          (item) => JSON.stringify(item) === JSON.stringify(theme),
        ),
      ),
    ) ?? [];
  const plugins = [
    ...new Map(
      nodes
        .flatMap((node) => node.inventory?.plugins ?? [])
        .map((plugin) => [plugin.id, plugin]),
    ).values(),
  ];
  return {
    catalog,
    nodes,
    themes,
    plugins,
    error,
    reload,
    loading: !catalog && !error,
  };
}
