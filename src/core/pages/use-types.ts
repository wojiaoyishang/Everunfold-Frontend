"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { readPageTypes, type PageTypeItem } from "@/core/contracts/pages";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { pagesFailure } from "./failure";

export function usePageTypes() {
  const { baseUrl } = useAdminRequest();
  const { catalog } = usePluginRuntime();
  const [items, setItems] = useState<PageTypeItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    void readPageTypes(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setItems(data.items);
        setError("");
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(pagesFailure(failure));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [baseUrl, catalog?.revision, attempt]);

  return {
    items,
    error,
    loading,
    reload: () => {
      setError("");
      setLoading(true);
      setAttempt((value) => value + 1);
    },
  };
}
