"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/auth/use-session";
import { RequestError } from "@/core/http/request";
import { authFailureMessage, checkedSession } from "@/core/auth/session";
import { logout } from "@/generated/auth-client";
import { Icon } from "../components/icon";
import { Button, TextLink } from "../components/ui/primitives";
import { SessionFeedback } from "./session-feedback";

export function AdminPage({ baseUrl }: { baseUrl: string }) {
  const router = useRouter();
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
    if (signedOut) router.replace("/login?next=%2Fadmin");
  }, [signedOut, router]);

  async function signOut() {
    if (leaving || state.phase !== "ready") return;
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
      router.replace("/login");
    } catch (error) {
      if (!controller.signal.aborted) {
        fail(error);
        setMessage(authFailureMessage(error, "logout"));
        setLeaving(false);
      }
    }
  }

  return (
    <main className="admin-stage">
      <header className="admin-header">
        <div className="management-brand">
          <Icon name="leaf" />
          <strong>Everunfold</strong>
          <span>管理后台</span>
        </div>
        <TextLink href="/" className="management-text-link">
          <Icon name="arrow-left" />
          返回站点
        </TextLink>
      </header>
      {state.phase !== "ready" || leaving ? (
        <section className="admin-gate">
          <SessionFeedback
            error={
              state.phase === "failed" && !signedOut ? state.error : undefined
            }
            failureMessage={message}
            onRetry={() => {
              setMessage("");
              void check();
            }}
            checkingText={
              leaving ? "正在退出登录" : signedOut ? "正在前往登录" : undefined
            }
          />
        </section>
      ) : (
        <section className="admin-panel" aria-labelledby="admin-title">
          <div className="admin-panel-heading">
            <span className="management-kicker">管理后台</span>
            <h1 id="admin-title">后台</h1>
          </div>
          <div className="admin-identity">
            <span className="admin-avatar">
              <Icon name="user" />
            </span>
            <div className="admin-identity-copy">
              <span>当前管理员</span>
              <strong>{state.session.user?.display_name}</strong>
              <span>@{state.session.user?.username}</span>
            </div>
            <span className="admin-role">管理员</span>
          </div>
          <div className="admin-empty">
            <Icon name="book" />
            <h2>暂无内容</h2>
          </div>
          <div className="admin-panel-actions">
            <Button
              className="admin-signout"
              disabled={leaving}
              onClick={() => void signOut()}
            >
              <Icon name="logout" />
              退出登录
            </Button>
          </div>
        </section>
      )}
      <noscript>
        <p>请启用 JavaScript 后访问后台。</p>
      </noscript>
    </main>
  );
}
