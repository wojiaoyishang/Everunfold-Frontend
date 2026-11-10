"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { AuthSessionState } from "@/core/contracts/auth";
import { readAdminSession, readAuthSession } from "@/core/contracts/auth";
import { createSessionCheck, type SessionView } from "./session-check";
import { announceSessionChange, watchSessionChange } from "./session-events";
import { randomUUID } from "@/core/browser/crypto";

/** Component-owned identity: never shared with public reader snapshots or persisted. */
export function useSession(baseUrl: string, admin = false) {
  const [state, setState] = useState<SessionView>({ phase: "checking" });
  const [observer] = useState(randomUUID);
  const current = useRef<ReturnType<typeof createSessionCheck> | null>(null);
  const check = useCallback(
    (background = false) => current.current?.check(background),
    [],
  );

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
    const unwatch = watchSessionChange(
      baseUrl,
      (signedOut) => {
        if (signedOut) reader.invalidate();
        void reader.check(!signedOut);
      },
      observer,
    );
    return () => {
      disposed = true;
      reader.dispose();
      if (current.current === reader) current.current = null;
      window.removeEventListener("pageshow", restore);
      window.removeEventListener("focus", focus);
      unwatch();
    };
  }, [baseUrl, admin, observer]);

  const accept = (session: AuthSessionState) => {
    current.current?.accept(session);
    announceSessionChange(baseUrl, !session.authenticated, observer);
  };
  const fail = (error: unknown) => current.current?.fail(error);
  return { state, check, accept, fail };
}
