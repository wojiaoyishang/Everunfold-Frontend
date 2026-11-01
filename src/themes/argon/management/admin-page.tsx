"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/auth/use-session";
import { RequestError } from "@/core/http/request";
import { authFailureMessage, checkedSession } from "@/core/auth/session";
import { logout } from "@/generated/auth-client";
import { Icon } from "../components/icon";
import { Button, TextLink } from "../components/ui/primitives";
import { ManagementEntry } from "./management-entry";
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

  if (state.phase !== "ready" || leaving) {
    return (
      <ManagementEntry
        panel={{
          kicker: "身份确认",
          title: "管理员后台",
          description: "正在读取当前管理员会话。",
        }}
      >
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
        <noscript>
          <p>请启用 JavaScript 后访问后台。</p>
        </noscript>
      </ManagementEntry>
    );
  }

  return (
    <main className="admin-shell">
      <header className="admin-toolbar">
        <div className="admin-toolbar-brand">
          <Icon name="leaf" />
          <strong>Everunfold</strong>
          <span>管理后台</span>
        </div>
        <nav className="admin-toolbar-actions" aria-label="站点操作">
          <span className="admin-toolbar-user">
            <Icon name="user" />
            {state.session.user?.display_name}
          </span>
          <TextLink href="/" className="admin-toolbar-link">
            <Icon name="external" />
            访问站点
          </TextLink>
        </nav>
      </header>
      <div className="admin-layout">
        <aside className="admin-menu">
          <div className="admin-menu-label">管理导航</div>
          <nav className="admin-menu-list" aria-label="后台主导航">
            <span
              className="admin-menu-item admin-menu-item-current"
              aria-current="page"
            >
              <Icon name="home" />
              仪表盘
            </span>
          </nav>
          <div className="admin-menu-footer">
            <Button className="admin-signout" onClick={() => void signOut()}>
              <Icon name="logout" />
              退出登录
            </Button>
          </div>
        </aside>
        <div className="admin-workspace">
          <div className="admin-workspace-inner">
            <header className="admin-page-heading">
              <span className="management-kicker">后台首页</span>
              <h1 id="admin-title">仪表盘</h1>
              <p>欢迎回来，{state.session.user?.display_name}。</p>
            </header>
            <div className="admin-dashboard-grid">
              <section
                className="admin-widget admin-widget-welcome"
                aria-labelledby="admin-welcome-title"
              >
                <header className="admin-widget-header">
                  <h2 id="admin-welcome-title">欢迎</h2>
                </header>
                <div className="admin-widget-body admin-welcome-body">
                  <span className="admin-avatar">
                    <Icon name="user" />
                  </span>
                  <div>
                    <strong>{state.session.user?.display_name}</strong>
                    <span>管理员</span>
                  </div>
                </div>
              </section>
              <section
                className="admin-widget admin-widget-account"
                aria-labelledby="admin-account-title"
              >
                <header className="admin-widget-header">
                  <h2 id="admin-account-title">当前账户</h2>
                </header>
                <div className="admin-widget-body">
                  <dl className="admin-account-list">
                    <div>
                      <dt>用户名</dt>
                      <dd>@{state.session.user?.username}</dd>
                    </div>
                    <div>
                      <dt>角色</dt>
                      <dd>管理员</dd>
                    </div>
                  </dl>
                </div>
              </section>
              <section
                className="admin-widget admin-widget-empty"
                aria-labelledby="admin-empty-title"
              >
                <header className="admin-widget-header">
                  <h2 id="admin-empty-title">工作区</h2>
                </header>
                <div className="admin-empty">
                  <Icon name="book" />
                  <span>暂无内容</span>
                </div>
              </section>
            </div>
            <footer className="admin-footer">Everunfold 管理后台</footer>
          </div>
        </div>
      </div>
      <noscript>
        <p>请启用 JavaScript 后访问后台。</p>
      </noscript>
    </main>
  );
}
