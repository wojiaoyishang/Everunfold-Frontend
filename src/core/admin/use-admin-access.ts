"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  clearRecovery,
  noServerRecovery,
  recoverySnapshot,
  recoveryForPage,
  subscribeRecovery,
} from "@/core/collaboration/recovery";
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
  const cachedRecovery = useSyncExternalStore(
    subscribeRecovery,
    recoverySnapshot,
    noServerRecovery,
  );
  const recovery =
    state.phase === "failed"
      ? recoveryForPage(cachedRecovery, pathname, state.previous?.user?.id)
      : null;
  const [leaving, setLeaving] = useState(false);
  const [message, setMessage] = useState("");
  const action = useRef<AbortController | null>(null);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    if (
      state.phase === "failed" &&
      state.error instanceof RequestError &&
      state.error.code === 40363
    )
      router.replace("/account");
  }, [state, router]);
  const signedOut =
    state.phase === "failed" &&
    state.error instanceof RequestError &&
    state.error.status === 401;
  useEffect(() => {
    if (!signedOut || recovery) return;
    const destination =
      loginReturnPath(
        `${pathname}${window.location.search}${window.location.hash}`,
      ) ?? "/admin";
    router.replace(`/login?next=${encodeURIComponent(destination)}`);
  }, [signedOut, pathname, router, recovery]);
  const previousPath = useRef(pathname);
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    if (cachedRecovery?.path !== pathname) clearRecovery();
    void check(true);
  }, [pathname, check, cachedRecovery?.path]);

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
      clearRecovery();
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
    recovery,
    csrfToken: state.phase === "ready" ? state.session.csrf_token : "",
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
