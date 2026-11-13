"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/core/auth/use-session";
import { checkedSession } from "@/core/auth/session";
import { captchaFailure, useCaptcha } from "@/core/captcha/use-captcha";
import {
  confirmRegistration,
  readRegistrationOptions,
  readRegistrationStatus,
  requestRegistration,
  type RegistrationOptions,
  type RegistrationState,
} from "@/core/contracts/auth";
import { RequestError } from "@/core/http/request";
import { UiText, useLocale } from "@/core/i18n/provider";
import { CaptchaField } from "../components/captcha-field";
import { FormField } from "../components/ui/form-field";
import { PasswordField } from "../components/ui/password-field";
import { Button, Form, TextField } from "../components/ui/primitives";
import { LoginSuccess } from "./login-success";
import { Icon } from "../components/icon";
import { EntryFooter } from "./entry-footer";
import { ManagementEntry } from "./management-entry";
import { SessionFeedback } from "./session-feedback";

const deliveryStatus: Record<RegistrationState["status"], string> = {
  queued: "邮件已排队，等待发送。",
  sending: "正在发送验证邮件。",
  sent: "邮件已发送，请查收验证码。",
  failed: "邮件发送失败，可以稍后重发。",
  unknown: "未能确认发送结果。如果已收到验证码，可以继续验证。",
  expired: "验证码已过期，请重新发送。",
};

function registrationFailure(error: unknown) {
  if (error instanceof RequestError) {
    if ([40386, 40387, 40986, 50386, 42986].includes(error.code ?? 0))
      return captchaFailure(error);
    if (error.code === 42278) return "邀请码无效或已使用。";
    if (error.code === 42279) return "验证码无效或已过期。";
    if (error.code === 40978) return "用户名或邮箱已被使用，请更换后重试。";
    if (error.code === 40378) return "注册政策已变更，请刷新页面。";
    if (error.code === 50378) return "注册邮件暂不可用。";
    if (error.status === 429) return "操作过于频繁，请稍后重试。";
    if (error.status === 422) return "请检查注册资料后重试。";
  }
  return "暂时无法完成注册，请稍后重试。";
}

export function RegistrationPage({ baseUrl }: { baseUrl: string }) {
  const { uiLocale } = useLocale();
  const { state, accept, check } = useSession(baseUrl);
  const card = useRef<HTMLDivElement>(null);
  const codeInput = useRef<HTMLInputElement>(null);
  const action = useRef<AbortController | null>(null);
  const [options, setOptions] = useState<RegistrationOptions | null>(null);
  const [draft, setDraft] = useState({
    username: "",
    display_name: "",
    email: "",
    password: "",
    invite_code: "",
  });
  const [pending, setPending] = useState<RegistrationState | null>(null);
  const [code, setCode] = useState("");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [message, setMessage] = useState("");
  const [reload, setReload] = useState(0);
  const [clock, setClock] = useState({ resend: 0, now: 0 });
  const ready = state.phase === "ready";
  const signedIn = ready && state.session.authenticated;
  const needsFactor = ready && state.session.mfa_required;
  const canRegister =
    ready &&
    !signedIn &&
    !needsFactor &&
    options?.mode !== "closed" &&
    !!options?.mail_ready;
  const showRequest = !pending || editing;
  const captcha = useCaptcha(
    baseUrl,
    "registration",
    undefined,
    canRegister && showRequest,
  );
  const remaining = Math.max(0, Math.ceil((clock.resend - clock.now) / 1000));

  useEffect(() => () => action.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    readRegistrationOptions(baseUrl, { signal: controller.signal })
      .then(({ data }) => setOptions(data))
      .catch(() => {
        if (!controller.signal.aborted)
          setMessage("无法读取注册状态，请稍后重试。");
      });
    return () => controller.abort();
  }, [baseUrl, reload]);
  useEffect(() => {
    if (!canRegister) return;
    const controller = new AbortController();
    void readRegistrationStatus(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const now = Date.now();
        setPending(data);
        setClock({ now, resend: now + data.retry_after_seconds * 1000 });
      })
      .catch(() => {
        // Most visitors have no pending request yet.
      });
    return () => controller.abort();
  }, [baseUrl, canRegister]);
  const requestId = pending?.request_id;
  const status =
    pending && Date.parse(pending.expires_at) <= clock.now
      ? "expired"
      : pending?.status;
  useEffect(() => {
    if (!requestId || editing) return;
    const controller = new AbortController();
    const tick = setInterval(
      () => setClock((current) => ({ ...current, now: Date.now() })),
      1000,
    );
    const poll =
      status === "queued" || status === "sending"
        ? setInterval(() => {
            void readRegistrationStatus(baseUrl, { signal: controller.signal })
              .then(({ data }) => {
                if (!controller.signal.aborted && data.request_id === requestId)
                  setPending(data);
              })
              .catch((error: unknown) => {
                if (
                  !controller.signal.aborted &&
                  error instanceof RequestError &&
                  error.status === 404
                ) {
                  setPending((previous) =>
                    previous ? { ...previous, status: "expired" } : null,
                  );
                }
              });
          }, 2000)
        : undefined;
    return () => {
      clearInterval(tick);
      clearInterval(poll);
      controller.abort();
    };
  }, [baseUrl, editing, requestId, status]);
  const canConfirm = status === "sent" || status === "unknown";
  useEffect(() => {
    if (canConfirm && !editing) codeInput.current?.focus();
  }, [canConfirm, editing]);

  function update(field: keyof typeof draft, value: string) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!ready || busy || !canRegister || (showRequest && !captcha.ready))
      return;
    const controller = new AbortController();
    action.current = controller;
    setBusy(true);
    setMessage("");
    try {
      if (showRequest) {
        const { data } = await requestRegistration(
          baseUrl,
          {
            ...draft,
            username: draft.username.trim(),
            invite_code:
              options?.mode === "invite" ? draft.invite_code.trim() : undefined,
            locale: uiLocale === "en" ? "en" : "zh-CN",
            captcha: captcha.response,
          },
          state.session.csrf_token,
          { signal: controller.signal },
        );
        const now = Date.now();
        setPending(data);
        setClock({ now, resend: now + data.retry_after_seconds * 1000 });
        setCode("");
        setEditing(false);
        update("password", "");
      } else if (pending && canConfirm) {
        const { data } = await confirmRegistration(
          baseUrl,
          { request_id: pending.request_id, code: code.trim() },
          state.session.csrf_token,
          { signal: controller.signal },
        );
        const session = checkedSession(data);
        setRegistered(session.authenticated);
        accept(session);
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(registrationFailure(error));
      if (showRequest) void captcha.refresh();
      if (error instanceof RequestError && error.code === 40310) void check();
      if (
        !showRequest &&
        error instanceof RequestError &&
        error.status === undefined
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
        title: !showRequest && canRegister ? "验证注册邮箱" : "注册账号",
        description:
          !showRequest && canRegister
            ? "输入邮件中的六位验证码。"
            : "验证邮箱后即可创建账号。",
      }}
    >
      {signedIn ? (
        <LoginSuccess
          destination="/account"
          cardRef={card}
          registered={registered}
        />
      ) : !ready ? (
        <SessionFeedback
          error={state.phase === "failed" ? state.error : undefined}
          onRetry={() => void check()}
        />
      ) : canRegister ? (
        <Form className="login-form" onSubmit={submit} aria-busy={busy}>
          {showRequest ? (
            <>
              <FormField id="register-username" label="用户名">
                <TextField
                  id="register-username"
                  autoComplete="username"
                  autoCapitalize="none"
                  required
                  minLength={2}
                  maxLength={64}
                  pattern="[A-Za-z0-9_.\-]+"
                  value={draft.username}
                  onChange={(event) => update("username", event.target.value)}
                  disabled={busy}
                />
              </FormField>
              <FormField id="register-display-name" label="显示名称">
                <TextField
                  id="register-display-name"
                  autoComplete="nickname"
                  required
                  maxLength={100}
                  value={draft.display_name}
                  onChange={(event) =>
                    update("display_name", event.target.value)
                  }
                  disabled={busy}
                />
              </FormField>
              <FormField id="register-email" label="邮箱">
                <TextField
                  id="register-email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={254}
                  value={draft.email}
                  onChange={(event) => update("email", event.target.value)}
                  disabled={busy}
                />
              </FormField>
              <FormField id="register-password" label="密码">
                <PasswordField
                  id="register-password"
                  autoComplete="new-password"
                  placeholder="至少 12 个字符"
                  required
                  minLength={12}
                  maxLength={1024}
                  value={draft.password}
                  onChange={(event) => update("password", event.target.value)}
                  disabled={busy}
                />
              </FormField>
              {options?.mode === "invite" && (
                <FormField id="register-invite" label="邀请码">
                  <TextField
                    id="register-invite"
                    autoComplete="off"
                    required
                    maxLength={100}
                    value={draft.invite_code}
                    onChange={(event) =>
                      update("invite_code", event.target.value)
                    }
                    disabled={busy}
                  />
                </FormField>
              )}
              <CaptchaField
                control={captcha}
                appearance="login"
                disabled={busy}
              />
            </>
          ) : (
            <>
              <p role="status">
                <UiText text={deliveryStatus[status ?? pending.status]} />
              </p>
              {canConfirm && (
                <FormField id="register-code" label="邮箱验证码">
                  <TextField
                    id="register-code"
                    ref={codeInput}
                    autoComplete="one-time-code"
                    inputMode="numeric"
                    required
                    maxLength={6}
                    pattern="[0-9]{6}"
                    value={code}
                    onChange={(event) => setCode(event.target.value)}
                    disabled={busy}
                  />
                </FormField>
              )}
            </>
          )}
          {message && (
            <p className="login-message" role="alert">
              <UiText text={message} />
            </p>
          )}
          {(showRequest || canConfirm) && (
            <Button
              className="management-primary login-submit"
              type="submit"
              disabled={
                busy ||
                (showRequest ? !captcha.ready : code.trim().length !== 6)
              }
            >
              <span>
                <UiText text={showRequest ? "发送验证码" : "验证并注册"} />
              </span>
              <Icon name="arrow" />
            </Button>
          )}
          {!showRequest && (
            <Button
              className="login-back"
              type="button"
              disabled={busy || remaining > 0}
              onClick={() => {
                setEditing(true);
                setMessage("");
              }}
            >
              <UiText text="重新发送验证码" />
              {remaining > 0 && <span>（{remaining}s）</span>}
            </Button>
          )}
        </Form>
      ) : (
        <div className="login-form">
          <p role="status">
            <UiText
              text={
                needsFactor
                  ? "请先完成两步验证。"
                  : message ||
                    (options
                      ? options.mode === "closed"
                        ? "站点当前不接受注册。"
                        : "注册邮件暂不可用。"
                      : "正在读取注册状态…")
              }
            />
          </p>
          {message && (
            <Button
              className="login-back"
              onClick={() => {
                setMessage("");
                setReload((value) => value + 1);
              }}
            >
              <UiText text="重新读取" />
            </Button>
          )}
        </div>
      )}
      {!signedIn && (
        <EntryFooter href="/login" label="登录" prompt="已有账号？" />
      )}
    </ManagementEntry>
  );
}
