"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { loginDestination } from "@/core/auth/routes";
import { useSession } from "@/core/auth/use-session";
import { authFailureMessage, checkedSession } from "@/core/auth/session";
import { RequestError } from "@/core/http/request";
import {
  completeSecondFactor,
  login,
  logout,
  readRegistrationOptions,
  readRecoveryOptions,
} from "@/core/contracts/auth";
import { Icon } from "../components/icon";
import { Button, Form, TextField } from "../components/ui/primitives";
import { FormField } from "../components/ui/form-field";
import { PasswordField } from "../components/ui/password-field";
import { RouteLink } from "../components/ui/route-link";
import { EntryFooter } from "./entry-footer";
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
  const [secondFactor, setSecondFactor] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const action = useRef<AbortController | null>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  const secondFactorField = useRef<HTMLInputElement>(null);
  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    if (!busy && message && passwordError) passwordField.current?.focus();
  }, [busy, message, passwordError]);
  const entering = state.phase === "ready" && state.session.authenticated;
  const pending = state.phase === "ready" && state.session.mfa_required;
  useEffect(() => {
    if (pending && !busy) secondFactorField.current?.focus();
  }, [busy, pending]);
  const showLogin = state.phase === "ready" && !entering && !pending;
  useEffect(() => {
    if (!showLogin) return;
    const controller = new AbortController();
    void readRegistrationOptions(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setRegistrationOpen(data.mode !== "closed");
      })
      .catch(() => {});
    void readRecoveryOptions(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setRecoveryOpen(data.enabled);
      })
      .catch(() => {});
    return () => controller.abort();
  }, [baseUrl, showLogin]);
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
      if (!session.authenticated && !session.mfa_required)
        throw new RequestError("invalid");
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

  async function submitSecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy || state.phase !== "ready" || !state.session.mfa_required) return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setMessage("");
    try {
      const response = await completeSecondFactor(
        baseUrl,
        { code: secondFactor.trim() },
        state.session.csrf_token,
        { signal: controller.signal },
      );
      const session = checkedSession(response.data);
      if (!session.authenticated) throw new RequestError("invalid");
      setSecondFactor("");
      accept(session);
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(
        error instanceof RequestError && error.status === 401
          ? "验证码或恢复码不正确，或验证已过期。"
          : authFailureMessage(error, "login"),
      );
      if (
        error instanceof RequestError &&
        (error.status === 401 ||
          error.status === 403 ||
          error.status === undefined)
      )
        void check(true);
    } finally {
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <ManagementEntry
      cardRef={card}
      panel={{
        title:
          state.phase === "ready" && state.session.mfa_required
            ? "两步验证"
            : "登录你的账号",
        description:
          state.phase === "ready" && state.session.mfa_required
            ? "输入认证器中的六位验证码，或使用一次性恢复码。"
            : "输入账号信息，继续访问。",
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
      ) : state.session.mfa_required ? (
        <Form
          className="login-form"
          onSubmit={submitSecondFactor}
          aria-busy={busy}
        >
          <FormField
            id="login-second-factor"
            label="验证码或恢复码"
            icon="lock"
          >
            <TextField
              id="login-second-factor"
              name="second-factor"
              autoComplete="one-time-code"
              required
              maxLength={32}
              value={secondFactor}
              onChange={(event) => setSecondFactor(event.target.value)}
              disabled={busy}
              ref={secondFactorField}
              aria-describedby={message ? "second-factor-error" : undefined}
            />
          </FormField>
          <div
            id="second-factor-error"
            className="login-message"
            role={message ? "alert" : undefined}
            aria-live="polite"
          >
            {message && <span>{message}</span>}
          </div>
          <Button
            type="submit"
            className="management-primary login-submit"
            disabled={busy || !secondFactor.trim()}
          >
            <UiText text={busy ? "正在验证…" : "完成登录"} />
          </Button>
          <Button
            type="button"
            className="login-back"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                const response = await logout(
                  baseUrl,
                  state.session.csrf_token,
                );
                accept(checkedSession(response.data));
                setSecondFactor("");
                setMessage("");
              } catch (error) {
                setMessage(authFailureMessage(error, "logout"));
              } finally {
                setBusy(false);
              }
            }}
          >
            <UiText text="返回账号登录" />
          </Button>
        </Form>
      ) : (
        <Form
          className="login-form login-credentials"
          onSubmit={submit}
          aria-busy={busy}
        >
          <FormField id="login-username" label="用户名或邮箱" icon="user">
            <TextField
              id="login-username"
              name="username"
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              required
              maxLength={254}
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              disabled={busy}
              placeholder="输入用户名或已验证邮箱"
            />
          </FormField>
          <FormField
            id="login-password"
            label="密码"
            icon="lock"
            invalid={passwordError}
            action={
              recoveryOpen && (
                <RouteLink href="/login/recover" className="login-entry-link">
                  <UiText text="忘记密码" />
                </RouteLink>
              )
            }
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
          <CaptchaField control={captcha} appearance="login" disabled={busy} />
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
      {showLogin && registrationOpen && (
        <EntryFooter
          href="/login/register"
          label="注册账号"
          prompt="还没有账号？"
        />
      )}
      <noscript>
        <p>
          <UiText text="请启用 JavaScript 后登录。" />
        </p>
      </noscript>
    </ManagementEntry>
  );
}
