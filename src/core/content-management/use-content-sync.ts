"use client";
import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readContentSync,
  retryContentSync,
} from "@/generated/content-admin-client";
import type { ContentSyncState } from "@/generated/content-admin-contract";
import { draftError } from "./draft-state";

export function useContentSync(refreshKey: number | string) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [state, setState] = useState<ContentSyncState | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const mounted = useRef(true);
  const inFlight = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const read = async () => {
      try {
        const response = await readContentSync(baseUrl, {
          signal: abort.signal,
        });
        if (abort.signal.aborted) return;
        setState(response.data);
        setError("");
        if (
          response.data.delivery.some(
            (node) => node.status === "pending" || node.status === "failed",
          )
        )
          timer = setTimeout(read, 2500);
      } catch (reason) {
        if (!abort.signal.aborted) setError(draftError(reason));
      }
    };
    void read();
    return () => {
      abort.abort();
      clearTimeout(timer);
    };
  }, [baseUrl, refreshKey, attempt]);
  return {
    state,
    error,
    busy,
    retry: async () => {
      if (inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const response = await retryContentSync(baseUrl, csrfToken);
        if (mounted.current) {
          setState(response.data);
          setError("");
          setAttempt((value) => value + 1);
        }
      } catch (reason) {
        if (mounted.current) setError(draftError(reason));
      } finally {
        inFlight.current = false;
        if (mounted.current) setBusy(false);
      }
    },
  };
}
