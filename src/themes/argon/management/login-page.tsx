"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/core/auth/use-session";
import { authFailureMessage, checkedSession } from "@/core/auth/session";
import { RequestError } from "@/core/http/request";
import { login, logout } from "@/generated/auth-client";
import { Icon } from "../components/icon";
import { Button, Form, TextField } from "../components/ui/primitives";
import { PasswordField } from "../components/ui/password-field";
import { ManagementEntry } from "./management-entry";
import { SessionFeedback } from "./session-feedback";

export function LoginPage({
  baseUrl,
  returnTo,
}: {
  baseUrl: string;
  returnTo: string;
}) {
  const router = useRouter();
  const { state, check, accept, fail } = useSession(baseUrl);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const action = useRef<AbortController | null>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    if (!busy && message) passwordField.current?.focus();
  }, [busy, message]);
  const entering =
    state.phase === "ready" &&
    state.session.authenticated &&
    state.session.user?.role === "admin";
  useEffect(() => {
    if (entering) router.replace(returnTo);
  }, [entering, returnTo, router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || state.phase !== "ready" || state.session.authenticated) return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const response = await login(
        baseUrl,
        { username: username.trim(), password },
        state.session.csrf_token,
        { signal: controller.signal },
      );
      const session = checkedSession(response.data);
      if (!session.authenticated) throw new RequestError("invalid");
      setPassword("");
      accept(session);
    } catch (error) {
      if (controller.signal.aborted) return;
      setPassword("");
      setMessage(authFailureMessage(error, "login"));
      if (!(
        error instanceof RequestError &&
        [401, 422, 429].includes(error.status ?? 0)
      )) {
        // A timed-out write may have succeeded. Recheck before another credential exchange.
        fail(error);
      }
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  async function switchAccount() {
    if (busy || state.phase !== "ready") return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const response = await logout(baseUrl, state.session.csrf_token, {
        signal: controller.signal,
      });
      const session = checkedSession(response.data);
      if (session.authenticated || session.user !== null)
        throw new RequestError("invalid");
      accept(session);
    } catch (error) {
      if (!controller.signal.aborted) fail(error);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <ManagementEntry
      intro={{
        kicker: "管理入口",
        title: "欢迎回来",
        description: "登录 Everunfold 管理后台。",
      }}
      panel={{
        kicker: "管理员登录",
        title: "登录后台",
        description: "使用管理员账号继续。",
      }}
    >
      {state.phase !== "ready" || entering ? (
        <SessionFeedback
          error={state.phase === "failed" ? state.error : undefined}
          failureMessage={message}
          onRetry={() => {
            setMessage("");
            void check();
          }}
          checkingText={entering ? "登录成功，正在进入" : undefined}
        />
      ) : state.session.authenticated ? (
        <div className="login-account">
          <Icon name="user" />
          <h3>{state.session.user?.display_name}</h3>
          <p className="login-account-username">
            @{state.session.user?.username}
          </p>
          <p>当前账号没有后台访问权限。</p>
          <Button
            className="management-primary"
            disabled={busy}
            onClick={() => void switchAccount()}
          >
            <span aria-live="polite">{busy ? "正在切换" : "切换账号"}</span>
          </Button>
        </div>
      ) : (
        <Form className="login-form" onSubmit={submit} aria-busy={busy}>
          <label htmlFor="login-username">用户名</label>
          <TextField
            id="login-username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            required
            maxLength={64}
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            disabled={busy}
            placeholder="输入用户名"
          />
          <label htmlFor="login-password">密码</label>
          <PasswordField
            id="login-password"
            name="password"
            autoComplete="current-password"
            required
            maxLength={1024}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={busy}
            ref={passwordField}
            placeholder="输入密码"
            aria-describedby={message ? "login-error" : undefined}
            aria-invalid={Boolean(message)}
          />
          <div
            className="login-message"
            id="login-error"
            role={message ? "alert" : undefined}
            aria-live="polite"
          >
            {message}
          </div>
          <Button
            type="submit"
            className="management-primary login-submit"
            disabled={busy || !username.trim() || !password}
          >
            <span aria-live="polite">{busy ? "正在登录" : "登录"}</span>
            <Icon
              name={busy ? "refresh" : "arrow"}
              className={busy ? "management-spinning" : undefined}
            />
          </Button>
        </Form>
      )}
      <p className="login-panel-footer">
        <Icon name="lock" />
        账号登录
      </p>
      <noscript>
        <p>请启用 JavaScript 后登录后台。</p>
      </noscript>
    </ManagementEntry>
  );
}
