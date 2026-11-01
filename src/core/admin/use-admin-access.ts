"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useSession } from "@/core/auth/use-session";
import { authFailureMessage, checkedSession } from "@/core/auth/session";
import { loginReturnPath } from "@/core/auth/routes";
import { RequestError } from "@/core/http/request";
import { logout } from "@/generated/auth-client";

/** One authenticated session owner for the persistent private workspace. */
export function useAdminAccess(baseUrl: string) {
  const router = useRouter();
  const pathname = usePathname();
  const { state, check, fail } = useSession(baseUrl, true);
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const action = useRef<AbortController | null>(null);
  useEffect(() => () => action.current?.abort(), []);
  const signedOut =
    state.phase === "failed" &&
    state.error instanceof RequestError &&
    state.error.status === 401;
  useEffect(() => {
    if (!signedOut) return;
    const destination =
      loginReturnPath(
        `${pathname}${window.location.search}${window.location.hash}`,
      ) ?? "/admin";
    router.replace(`/login?next=${encodeURIComponent(destination)}`);
  }, [signedOut, pathname, router]);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    void check(true);
  }, [pathname, check]);

  async function signOut() {
    if (action.current || state.phase !== "ready") return;
    const controller = new AbortController();
    action.current = controller;
    setLeaving(true);
    try {
      const response = await logout(baseUrl, state.session.csrf_token, {
        signal: controller.signal,
      });
      const session = checkedSession(response.data);
      if (session.authenticated || session.user !== null)
        throw new RequestError("invalid");
      if (!controller.signal.aborted) router.replace("/login");
    } catch (error) {
      if (!controller.signal.aborted) {
        fail(error);
        setMessage(authFailureMessage(error, "logout"));
        setLeaving(false);
      }
    } finally {
      if (action.current === controller) action.current = null;
    }
  }
  return {
    user: !leaving && state.phase === "ready" ? state.session.user : null,
    error:
      !signedOut && state.phase === "failed"
        ? message || authFailureMessage(state.error, "session")
        : "",
    status: leaving
      ? "正在退出登录"
      : signedOut
        ? "正在前往登录"
        : "正在确认登录状态",
    retry: () => {
      setMessage("");
      void check();
    },
    signOut,
  };
}
