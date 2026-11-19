"use client";
import { UiText, useT } from "@/core/i18n/provider";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { loginDestination, loginFlowHref } from "@/core/auth/routes";
import { useSession } from "@/core/auth/use-session";
import {
  authFailureMessage,
  checkedSession,
  isExpiredSession,
} from "@/core/auth/session";
import { RequestError } from "@/core/http/request";
import {
  completeSecondFactor,
  login,
  logout,
  readRegistrationOptions,
  readRecoveryOptions,
} from "@/core/contracts/auth";
import { useToastFeedback } from "../components/ui/toast/feedback";
import { EntrySubmit } from "./entry-submit";
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
  const t = useT();
  const card = useRef<HTMLDivElement>(null);
  const { state, check, accept } = useSession(baseUrl);
  const captcha = useCaptcha(baseUrl, "login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secondFactor, setSecondFactor] = useState("");
  const [busy, setBusy] = useState(false);
  const notify = useToastFeedback();
  const [passwordError, setPasswordError] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [recoveryOpen, setRecoveryOpen] = useState(false);
  const action = useRef<AbortController | null>(null);
  const passwordField = useRef<HTMLInputElement>(null);
  const secondFactorField = useRef<HTMLInputElement>(null);
  useEffect(() => () => action.current?.abort(), []);
  const restorePasswordFocus = useRef(false);
  const entering = state.phase === "ready" && state.session.authenticated;
  const pending = state.phase === "ready" && state.session.mfa_required;
  useEffect(() => {
    if (pending && !busy) secondFactorField.current?.focus();
  }, [busy, pending]);
  const showLogin = state.phase === "ready" && !entering && !pending;
  useEffect(() => {
    if (busy || !showLogin || (!passwordError && !restorePasswordFocus.current))
      return;
    restorePasswordFocus.current = false;
    passwordField.current?.focus();
  }, [busy, showLogin, passwordError]);
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

  async function run(work: (signal: AbortSignal) => Promise<void>) {
    if (action.current) return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    try {
      await work(controller.signal);
    } finally {
      if (action.current === controller) action.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  function completeLogin(session: ReturnType<typeof checkedSession>) {
    setPassword("");
    setSecondFactor("");
    notify("登录成功", "success");
    accept(session);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !captcha.ready ||
      !username.trim() ||
      !password ||
      state.phase !== "ready" ||
      state.session.authenticated ||
      state.session.mfa_required
    )
      return;
    const csrf = state.session.csrf_token;
    await run(async (signal) => {
      setPasswordError(false);
      try {
        const response = await login(
          baseUrl,
          { username: username.trim(), password, captcha: captcha.response },
          csrf,
          { signal },
        );
        if (signal.aborted) return;
        const session = checkedSession(response.data);
        if (session.authenticated) completeLogin(session);
        else if (session.mfa_required) accept(session);
        else throw new RequestError("invalid");
      } catch (error) {
        if (signal.aborted) return;
        if (isExpiredSession(error)) {
          const session = await check();
          if (signal.aborted) return;
          if (session?.authenticated) completeLogin(session);
          else if (session && !session.mfa_required) {
            restorePasswordFocus.current = true;
            notify("登录状态已刷新，已保留输入。请再次登录。", "info");
            void captcha.refresh();
          } else if (!session) notify("无法刷新登录状态，请重新检查。");
          return;
        }
        if (
          error instanceof RequestError &&
          [40386, 40387, 40986, 50386, 42986].includes(error.code ?? 0)
        ) {
          notify(captchaFailure(error));
          void captcha.refresh();
          return;
        }
        setPasswordError(error instanceof RequestError && error.status === 401);
        // A timed-out write may have succeeded. Recheck before another credential exchange.
        if (!(
          error instanceof RequestError &&
          [401, 422, 429].includes(error.status ?? 0)
        )) {
          const session = await check();
          if (signal.aborted) return;
          if (session?.authenticated) {
            completeLogin(session);
            return;
          }
          if (session?.mfa_required) return;
        }
        notify(authFailureMessage(error, "login"));
        void captcha.refresh();
      }
    });
  }

  async function submitSecondFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      !secondFactor.trim() ||
      state.phase !== "ready" ||
      !state.session.mfa_required
    )
      return;
    const csrf = state.session.csrf_token;
    await run(async (signal) => {
      try {
        const response = await completeSecondFactor(
          baseUrl,
          { code: secondFactor.trim() },
          csrf,
          { signal },
        );
        if (signal.aborted) return;
        const session = checkedSession(response.data);
        if (!session.authenticated) throw new RequestError("invalid");
        completeLogin(session);
      } catch (error) {
        if (signal.aborted) return;
        if (error instanceof RequestError && error.status === 401) {
          const session = await check(true);
          if (signal.aborted) return;
          if (session?.authenticated) completeLogin(session);
          else if (session && !session.mfa_required) {
            setSecondFactor("");
            restorePasswordFocus.current = true;
            void captcha.refresh();
            notify("两步验证已过期，已保留登录信息。请重新登录。", "info");
          } else notify("验证码或恢复码不正确，或验证已过期。");
        } else if (isExpiredSession(error)) {
          const session = await check();
          if (signal.aborted) return;
          if (session?.authenticated) completeLogin(session);
          else if (session) {
            if (!session.mfa_required) {
              setSecondFactor("");
              void captcha.refresh();
            }
            notify("登录状态已刷新，已保留输入。请重试。", "info");
          } else notify("无法刷新登录状态，请重新检查。");
        } else {
          const session = await check();
          if (signal.aborted) return;
          if (session?.authenticated) completeLogin(session);
          else notify(authFailureMessage(error, "login"));
        }
      }
    });
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
          backHref={false}
          onRetry={() => void check()}
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
            />
          </FormField>
          <EntrySubmit
            label="完成登录"
            busyLabel="正在验证…"
            busy={busy}
            disabled={!secondFactor.trim()}
          />
          <Button
            type="button"
            className="login-back"
            disabled={busy}
            onClick={() => {
              void run(async (signal) => {
                try {
                  const response = await logout(
                    baseUrl,
                    state.session.csrf_token,
                    { signal },
                  );
                  if (signal.aborted) return;
                  accept(checkedSession(response.data));
                  setSecondFactor("");
                  void captcha.refresh();
                } catch (error) {
                  if (!signal.aborted)
                    notify(authFailureMessage(error, "logout"));
                }
              });
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
              onChange={(event) => {
                setUsername(event.target.value);
                setPasswordError(false);
              }}
              disabled={busy}
              placeholder={t("输入用户名")}
            />
          </FormField>
          <FormField
            id="login-password"
            label="密码"
            icon="lock"
            invalid={passwordError}
            action={
              recoveryOpen && (
                <RouteLink
                  href={loginFlowHref("/login/recover", returnTo)}
                  className="login-entry-link"
                >
                  <UiText text="忘记密码？" />
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
              onChange={(event) => {
                setPassword(event.target.value);
                setPasswordError(false);
              }}
              disabled={busy}
              ref={passwordField}
              placeholder="输入密码"
              aria-invalid={passwordError}
            />
          </FormField>
          <CaptchaField control={captcha} appearance="login" disabled={busy} />
          <EntrySubmit
            label="登录"
            busyLabel="正在登录"
            busy={busy}
            disabled={!captcha.ready || !username.trim() || !password}
          />
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
