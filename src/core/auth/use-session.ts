"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthSessionState } from "@/generated/auth-contract";
import { readAdminSession, readAuthSession } from "@/generated/auth-client";
import { RequestError } from "@/core/http/request";
import { checkedSession } from "./session";

type SessionView =
  | { phase: "checking" }
  | { phase: "ready"; session: AuthSessionState }
  | { phase: "failed"; error: unknown };

/** Private page state only: never shared with the public reader cache or persisted. */
export function useSession(baseUrl: string, admin = false) {
  const [state, setState] = useState<SessionView>({ phase: "checking" });
  const current = useRef<AbortController | null>(null);
  const mounted = useRef(false);
  const check = useCallback(async () => {
    if (!mounted.current) return;
    current.current?.abort();
    const controller = new AbortController();
    current.current = controller;
    setState({ phase: "checking" });
    try {
      const result = await (admin ? readAdminSession : readAuthSession)(
        baseUrl,
        { signal: controller.signal },
      );
      const session = checkedSession(result.data, admin);
      if (!controller.signal.aborted && mounted.current)
        setState({ phase: "ready", session });
    } catch (error) {
      if (!controller.signal.aborted && mounted.current)
        setState({ phase: "failed", error });
    }
  }, [baseUrl, admin]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    // Strict Mode's discarded setup must not create another anonymous cookie.
    queueMicrotask(() => {
      if (!disposed) void check();
    });
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) void check();
    };
    const focus = () => {
      if (admin) void check();
    };
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", focus);
    return () => {
      disposed = true;
      mounted.current = false;
      current.current?.abort();
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", focus);
    };
  }, [check, admin]);

  const accept = (session: AuthSessionState) => {
    current.current?.abort();
    if (mounted.current)
      setState({ phase: "ready", session: checkedSession(session) });
  };
  const fail = (error: unknown) => {
    current.current?.abort();
    if (
      mounted.current &&
      !(error instanceof RequestError && error.kind === "cancelled")
    )
      setState({ phase: "failed", error });
  };
  return { state, check, accept, fail };
}
