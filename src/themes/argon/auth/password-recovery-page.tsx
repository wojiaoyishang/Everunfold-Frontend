"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { loginFlowHref } from "@/core/auth/routes";
import { isExpiredSession } from "@/core/auth/session";
import { useSession } from "@/core/auth/use-session";
import {
  confirmPasswordRecovery,
  readRecoveryOptions,
  requestPasswordRecovery,
} from "@/core/contracts/auth";
import { RequestError } from "@/core/http/request";
import { UiText, useT } from "@/core/i18n/provider";
import { FormField } from "../components/ui/form-field";
import { PasswordField } from "../components/ui/password-field";
import { Button, Form, TextField } from "../components/ui/primitives";
import { useToastFeedback } from "../components/ui/toast/feedback";
import { EntryFooter } from "./entry-footer";
import { EntrySubmit } from "./entry-submit";
import { ManagementEntry } from "./management-entry";
import { SessionFeedback } from "./session-feedback";

function failureMessage(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 40380) return "站点未开放找回密码。";
    if (error.code === 50380) return "找回密码邮件暂不可用。";
    if (error.code === 42280) return "重置码无效或已过期。";
    if (error.status === 429) return "操作过于频繁，请稍后重试。";
    if (error.status === 422) return "请检查重置码和新密码。";
  }
  return "暂时无法完成操作，请稍后重试。";
}

export function PasswordRecoveryPage({
  baseUrl,
  returnTo,
}: {
  baseUrl: string;
  returnTo: string | undefined;
}) {
  const t = useT();
  const notify = useToastFeedback();
  const { state, check } = useSession(baseUrl);
  const card = useRef<HTMLDivElement>(null);
  const operation = useRef<AbortController | null>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const retryAt = useRef(0);
  const [retrySeconds, setRetrySeconds] = useState(0);
  const coolingDown = retrySeconds > 0;
  const [availability, setAvailability] = useState<
    "loading" | "enabled" | "disabled" | "error"
  >("loading");
  const [stage, setStage] = useState<"request" | "reset" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState<"request" | "reset" | null>(null);
  const [reload, setReload] = useState(0);
  const backHref = loginFlowHref("/login", returnTo);

  useEffect(() => () => operation.current?.abort(), []);
  useEffect(() => {
    const controller = new AbortController();
    void readRecoveryOptions(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted)
          setAvailability(data.enabled ? "enabled" : "disabled");
      })
      .catch(() => {
        if (!controller.signal.aborted) setAvailability("error");
      });
    return () => controller.abort();
  }, [baseUrl, reload]);
  useEffect(() => {
    if (stage === "reset" && !busy) codeField.current?.focus();
  }, [stage, busy]);
  useEffect(() => {
    if (!coolingDown) return;
    const timer = window.setInterval(() => {
      setRetrySeconds(
        Math.max(0, Math.ceil((retryAt.current - Date.now()) / 1000)),
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [coolingDown]);

  function startCooldown(seconds: number) {
    retryAt.current = Date.now() + seconds * 1000;
    setRetrySeconds(seconds);
  }

  async function run(intent: "request" | "reset") {
    if (
      operation.current ||
      state.phase !== "ready" ||
      state.session.authenticated ||
      state.session.mfa_required ||
      availability !== "enabled"
    )
      return;
    if (intent === "request" && (!identifier.trim() || coolingDown)) return;
    if (intent === "reset" && password !== confirmation) {
      notify("两次输入的密码不一致。");
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(intent);
    try {
      const csrf = state.session.csrf_token;
      if (intent === "request") {
        await requestPasswordRecovery(
          baseUrl,
          { identifier: identifier.trim() },
          csrf,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        startCooldown(60);
        setCode("");
        setStage("reset");
        notify("若账号已绑定验证邮箱，重置码将发送到该邮箱。", "info");
      } else {
        await confirmPasswordRecovery(
          baseUrl,
          { code: code.trim(), new_password: password },
          csrf,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setCode("");
        setPassword("");
        setConfirmation("");
        setStage("done");
        notify("密码重置成功。", "success");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      if (isExpiredSession(error)) {
        const session = await check();
        if (controller.signal.aborted) return;
        if (session && !session.authenticated && !session.mfa_required) {
          setCode("");
          startCooldown(0);
          setStage("request");
          notify("登录状态已刷新，请重新获取重置码。", "info");
        } else if (!session) notify("无法刷新登录状态，请重新检查。");
      } else {
        if (error instanceof RequestError) {
          if (error.code === 40380) setAvailability("disabled");
          if (error.status === 429 && intent === "request") {
            startCooldown(Math.max(1, error.retryAfterSeconds ?? 60));
          }
        }
        notify(failureMessage(error));
      }
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(null);
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (stage !== "done") void run(stage);
  }

  const cooldownLabel = t("可在 {seconds} 秒后重发", { seconds: retrySeconds });

  return (
    <ManagementEntry
      cardRef={card}
      panel={{
        title: stage === "reset" ? "重置密码" : "找回密码",
        description:
          stage === "done"
            ? "请使用新密码登录。"
            : stage === "reset"
              ? "在当前浏览器输入邮件里的重置码，再设置新密码。"
              : "通过已验证的邮箱找回账号密码。",
      }}
    >
      {stage === "done" ? null : state.phase !== "ready" ? (
        <SessionFeedback
          error={state.phase === "failed" ? state.error : undefined}
          onRetry={() => void check()}
          backHref={false}
        />
      ) : state.session.authenticated || state.session.mfa_required ? (
        <p role="status">
          <UiText text="请先退出当前账号。" />
        </p>
      ) : availability !== "enabled" ? (
        <>
          <p role="status">
            <UiText
              text={
                availability === "disabled"
                  ? "站点未开放找回密码。"
                  : availability === "error"
                    ? "无法读取找回密码设置。"
                    : "正在读取设置…"
              }
            />
          </p>
          {availability === "error" && (
            <Button
              className="login-back"
              onClick={() => {
                setAvailability("loading");
                setReload((value) => value + 1);
              }}
            >
              <UiText text="重新读取" />
            </Button>
          )}
        </>
      ) : (
        <Form className="login-form" onSubmit={submit} aria-busy={!!busy}>
          {stage === "request" ? (
            <FormField
              id="recovery-identifier"
              label="用户名或邮箱"
              icon="user"
            >
              <TextField
                id="recovery-identifier"
                name="username"
                value={identifier}
                maxLength={254}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                disabled={!!busy}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </FormField>
          ) : (
            <>
              <FormField id="recovery-code" label="重置码" icon="lock">
                <TextField
                  id="recovery-code"
                  name="code"
                  ref={codeField}
                  value={code}
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={32}
                  required
                  disabled={!!busy}
                  onChange={(event) => setCode(event.target.value.trim())}
                />
              </FormField>
              <FormField id="recovery-password" label="新密码" icon="lock">
                <PasswordField
                  id="recovery-password"
                  name="new-password"
                  value={password}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  disabled={!!busy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </FormField>
              <FormField
                id="recovery-confirmation"
                label="确认新密码"
                icon="lock"
              >
                <PasswordField
                  id="recovery-confirmation"
                  name="confirm-password"
                  value={confirmation}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  disabled={!!busy}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </FormField>
            </>
          )}
          <EntrySubmit
            label={stage === "request" ? "发送重置码" : "重置密码"}
            busyLabel={busy === "request" ? "正在请求重置码…" : "正在重置密码…"}
            busy={!!busy}
            disabled={
              stage === "request"
                ? !identifier.trim() || coolingDown
                : !/^[A-Za-z0-9_-]{32}$/.test(code) ||
                  password.length < 12 ||
                  confirmation.length < 12
            }
          />
          <div className="login-recovery-actions">
            {stage === "reset" && !!identifier.trim() && (
              <Button
                className="login-back"
                disabled={!!busy || coolingDown}
                onClick={() => void run("request")}
              >
                {coolingDown ? cooldownLabel : <UiText text="重新发送重置码" />}
              </Button>
            )}
            {stage === "request" && coolingDown && <span>{cooldownLabel}</span>}
            <Button
              className="login-back"
              disabled={!!busy}
              onClick={() =>
                setStage(stage === "request" ? "reset" : "request")
              }
            >
              <UiText
                text={stage === "request" ? "我已收到重置码" : "返回输入账号"}
              />
            </Button>
          </div>
        </Form>
      )}
      <EntryFooter href={backHref} label="返回账号登录" />
    </ManagementEntry>
  );
}
