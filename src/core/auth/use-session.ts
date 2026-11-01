"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthSessionState } from "@/generated/auth-contract";
import { readAdminSession, readAuthSession } from "@/generated/auth-client";
import { createSessionCheck, type SessionView } from "./session-check";

/** Private page state only: never shared with the public reader cache or persisted. */
export function useSession(baseUrl: string, admin = false) {
  const [state, setState] = useState<SessionView>({ phase: "checking" });
  const current = useRef<ReturnType<typeof createSessionCheck> | null>(null);
  const check = useCallback(() => current.current?.check(), []);

  useEffect(() => {
    const reader = createSessionCheck(
      async (signal) => {
        const result = await (admin ? readAdminSession : readAuthSession)(
          baseUrl,
          { signal },
        );
        return result.data;
      },
      setState,
      admin,
    );
    current.current = reader;
    let disposed = false;
    // Strict Mode's discarded setup must not create another anonymous cookie.
    queueMicrotask(() => {
      if (!disposed) void reader.check();
    });
    const restore = (event: PageTransitionEvent) => {
      if (event.persisted) void reader.check();
    };
    const focus = () => {
      if (admin) void reader.check(true);
    };
    window.addEventListener("pageshow", restore);
    window.addEventListener("focus", focus);
    return () => {
      disposed = true;
      reader.dispose();
      if (current.current === reader) current.current = null;
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", focus);
    };
  }, [baseUrl, admin]);

  const accept = (session: AuthSessionState) =>
    current.current?.accept(session);
  const fail = (error: unknown) => current.current?.fail(error);
  return { state, check, accept, fail };
}
