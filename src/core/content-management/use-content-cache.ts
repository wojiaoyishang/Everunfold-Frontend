"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  maintainContentCache,
  readContentCache,
  type ContentCacheCommand,
  type ContentCacheState,
  type ContentCacheTarget,
} from "@/core/contracts/content-admin";
import { draftError } from "./draft-state";

export function useContentCache({ id, kind }: ContentCacheTarget) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [state, setState] = useState<ContentCacheState>();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [actionError, setActionError] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [completed, setCompleted] = useState<ContentCacheCommand["action"]>();
  const reading = useRef<AbortController | null>(null);
  const writing = useRef<AbortController | null>(null);

  const refresh = () => {
    setLoading(true);
    setRefreshKey((key) => key + 1);
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    reading.current = controller;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let remaining = 12;
    async function read() {
      try {
        const { data } = await readContentCache(
          baseUrl,
          { id, kind },
          { signal },
        );
        if (signal.aborted) return;
        setState(data);
        setLoadError(false);
        if (
          remaining-- > 0 &&
          data.nodes.some(
            ({ state }) => state === "pending" || state === "retrying",
          )
        )
          timer = setTimeout(() => void read(), 2500);
      } catch {
        if (!signal.aborted) setLoadError(true);
      } finally {
        if (!signal.aborted) setLoading(false);
      }
    }
    void read();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [baseUrl, id, kind, refreshKey]);

  useEffect(() => () => writing.current?.abort(), []);

  async function run(action: ContentCacheCommand["action"]) {
    if (writing.current) return false;
    reading.current?.abort();
    const controller = new AbortController();
    writing.current = controller;
    setActionError("");
    setCompleted(undefined);
    try {
      const { data } = await maintainContentCache(
        baseUrl,
        { id, kind, action },
        csrfToken,
        { signal: controller.signal, timeoutMs: 30000 },
      );
      if (controller.signal.aborted) return false;
      setState(data);
      setCompleted(action);
      return true;
    } catch (error) {
      if (!controller.signal.aborted) setActionError(draftError(error));
      return false;
    } finally {
      writing.current = null;
      if (!controller.signal.aborted) setRefreshKey((key) => key + 1);
    }
  }

  return {
    state,
    loading,
    loadError,
    actionError,
    setActionError,
    completed,
    refresh,
    run,
  };
}
