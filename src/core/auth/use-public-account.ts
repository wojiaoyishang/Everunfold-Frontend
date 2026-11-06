"use client";
import { useEffect } from "react";
import { useSession } from "./use-session";

/** Browser-only identity for the public header, separate from public reader snapshots. */
export function usePublicAccount(baseUrl: string) {
  const session = useSession(baseUrl);
  const { state, check } = session;
  useEffect(() => {
    const refresh = () => {
      if (!document.hidden) void check(true);
    };
    window.addEventListener("focus", refresh);
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [check]);
  const expires = state.phase === "ready" ? state.session.expires_at : null;
  useEffect(() => {
    if (!expires) return;
    const remaining = Date.parse(expires) - Date.now();
    const timer = setTimeout(
      () => void check(),
      Math.min(Math.max(remaining, 0), 2147483647),
    );
    return () => clearTimeout(timer);
  }, [check, expires]);
  return session;
}
