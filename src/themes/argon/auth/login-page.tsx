"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { loginDestination } from "@/core/auth/routes";
import { useSession } from "@/core/auth/use-session";
import { authFailureMessage, checkedSession } from "@/core/auth/session";
import { RequestError } from "@/core/http/request";
import { login } from "@/core/contracts/auth";
import { Icon } from "../components/icon";
import { Button, Form, TextField } from "../components/ui/primitives";
import { FormField } from "../components/ui/form-field";
import { PasswordField } from "../components/ui/password-field";
import { ManagementEntry } from "./management-entry";
import { SessionFeedback } from "./session-feedback";
import { LoginSuccess } from "./login-success";
import { canAccessAdmin } from "@/core/accounts/permissions";
import { useCaptcha, captchaFailure } from "@/core/captcha/use-captcha";
import { CaptchaField } from "../components/captcha-field";

export function LoginPage({
  baseUrl,
  returnTo,
}: {
  baseUrl: string;
  returnTo: string | undefined;
}) {
  const card = useRef<HTMLDivElement>(null);
  const { state, check, accept, fail } = useSession(baseUrl);
  const captcha = useCaptcha(baseUrl, "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const action = useRef<AbortController | null>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    if (!busy && message && passwordError) passwordField.current?.focus();
  }, [busy, message, passwordError]);
  const entering = state.phase === "ready" && state.session.authenticated;
  const destination = loginDestination(
    returnTo,
    state.phase === "ready" && canAccessAdmin(state.session.user),
    state.phase === "ready" && state.session.user?.must_change_password,
  );

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      busy ||
      !captcha.ready ||
      state.phase !== "ready" ||
      state.session.authenticated
    )
      return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setMessage("");
    setPasswordError(false);
    try {
      const response = await login(
        baseUrl,
        { username: username.trim(), password, captcha: captcha.response },
        state.session.csrf_token,
        { signal: controller.signal },
      );
      const session = checkedSession(response.data);
      if (!session.authenticated) throw new RequestError("invalid");
      setPassword("");
      accept(session);
    } catch (error) {
      if (controller.signal.aborted) return;
      if (
        error instanceof RequestError &&
        [40386, 40387, 40986, 50386, 42986].includes(error.code ?? 0)
      ) {
        setMessage(captchaFailure(error));
        void captcha.refresh();
        return;
      }
      setPassword("");
      setMessage(authFailureMessage(error, "login"));
      setPasswordError(error instanceof RequestError && error.status === 401);
      void captcha.refresh();
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

  return (
    <ManagementEntry
      cardRef={card}
      panel={{
        title: "登录你的账号",
        description: "输入账号信息，继续访问。",
      }}
    >
      {entering ? (
        <LoginSuccess
          key={destination}
          destination={destination}
          cardRef={card}
        />
      ) : state.phase !== "ready" ? (
        <SessionFeedback
          error={state.phase === "failed" ? state.error : undefined}
          failureMessage={message}
          onRetry={() => {
            setMessage("");
            void check();
          }}
        />
      ) : (
        <Form className="login-form" onSubmit={submit} aria-busy={busy}>
          <FormField id="login-username" label="用户名" icon="user">
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
          </FormField>
          <FormField
            id="login-password"
            label="密码"
            icon="lock"
            invalid={passwordError}
          >
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
              aria-invalid={passwordError}
            />
          </FormField>
          <CaptchaField control={captcha} />
          <div
            className="login-message"
            id="login-error"
            role={message ? "alert" : undefined}
            aria-live="polite"
          >
            {message && (
              <>
                <Icon name="close" />
                <span>{message}</span>
              </>
            )}
          </div>
          <Button
            type="submit"
            className="management-primary login-submit"
            disabled={busy || !captcha.ready || !username.trim() || !password}
          >
            <span aria-live="polite">
              {busy ? <UiText text="正在登录" /> : <UiText text="登录" />}
            </span>
            <Icon
              name={busy ? "refresh" : "arrow"}
              className={busy ? "management-spinning" : undefined}
            />
          </Button>
        </Form>
      )}
      <noscript>
        <p>
          <UiText text="请启用 JavaScript 后登录。" />
        </p>
      </noscript>
    </ManagementEntry>
  );
}
