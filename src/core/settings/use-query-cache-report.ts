"use client";

import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readQueryCacheReport,
  type SettingsContract,
} from "@/core/contracts/settings";

export type QueryCacheReport = SettingsContract["query_cache_report"]["data"];
export type QueryCacheHours = QueryCacheReport["hours"];

export function useQueryCacheReport(hours: QueryCacheHours) {
  const { baseUrl } = useAdminRequest();
  const [snapshot, setSnapshot] = useState<{
    baseUrl: string;
    report: QueryCacheReport;
  }>();
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const sequence = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let inFlight = false;
    let request: AbortController | undefined;
    const refresh = async (foreground = false) => {
      if (signal.aborted || inFlight || (!foreground && document.hidden))
        return;
      const id = ++sequence.current;
      request = new AbortController();
      inFlight = true;
      if (foreground) {
        setLoading(true);
        setError(false);
      }
      try {
        const response = await readQueryCacheReport(
          baseUrl,
          { hours },
          { signal: request.signal },
        );
        if (!signal.aborted && id === sequence.current) {
          setSnapshot({ baseUrl, report: response.data });
          setError(false);
        }
      } catch {
        if (!signal.aborted && id === sequence.current) setError(true);
      } finally {
        inFlight = false;
        if (!signal.aborted && id === sequence.current) setLoading(false);
      }
    };
    const onVisible = () => {
      if (!document.hidden) void refresh();
    };
    queueMicrotask(() => void refresh(true));
    const timer = window.setInterval(() => void refresh(), 60_000);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      controller.abort();
      request?.abort();
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [baseUrl, hours, refreshKey]);

  return {
    report:
      snapshot?.baseUrl === baseUrl && snapshot.report.hours === hours
        ? snapshot.report
        : undefined,
    loading,
    error,
    refresh: () => setRefreshKey((key) => key + 1),
  };
}
