"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSession } from "@/core/auth/use-session";
import {
  confirmPasswordRecovery,
  readRecoveryOptions,
  requestPasswordRecovery,
} from "@/core/contracts/auth";
import { RequestError } from "@/core/http/request";
import { UiText } from "@/core/i18n/provider";
import { FormField } from "../components/ui/form-field";
import { PasswordField } from "../components/ui/password-field";
import { Button, Form, TextField } from "../components/ui/primitives";
import { Icon } from "../components/icon";
import { EntryFooter } from "./entry-footer";
import { ManagementEntry } from "./management-entry";
import { SessionFeedback } from "./session-feedback";

function failureMessage(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 40380) return "站点未开放找回密码。";
    if (error.code === 50380) return "找回密码邮件暂不可用。";
    if (error.code === 42280) return "重置码无效或已过期。";
    if (error.status === 429) return "操作过于频繁，请稍后重试。";
    if (error.code === 40310) return "会话已更新，请重试。";
  }
  return "暂时无法完成操作，请稍后重试。";
}

export function PasswordRecoveryPage({ baseUrl }: { baseUrl: string }) {
  const { state, check } = useSession(baseUrl);
  const card = useRef<HTMLDivElement>(null);
  const operation = useRef<AbortController | null>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const [availability, setAvailability] = useState<
    "loading" | "enabled" | "disabled" | "error"
  >("loading");
  const [stage, setStage] = useState<"request" | "reset" | "done">("request");
  const [identifier, setIdentifier] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [requested, setRequested] = useState(false);
  const [reload, setReload] = useState(0);
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
    if (stage === "reset") codeField.current?.focus();
  }, [stage]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (
      operation.current ||
      state.phase !== "ready" ||
      state.session.authenticated ||
      state.session.mfa_required ||
      availability !== "enabled"
    )
      return;
    if (stage === "reset" && password !== confirmation) {
      setMessage("两次输入的密码不一致。");
      return;
    }
    const controller = new AbortController();
    operation.current = controller;
    setBusy(true);
    setMessage("");
    try {
      if (stage === "request") {
        await requestPasswordRecovery(
          baseUrl,
          { identifier: identifier.trim() },
          state.session.csrf_token,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setRequested(true);
        setStage("reset");
      } else if (stage === "reset") {
        await confirmPasswordRecovery(
          baseUrl,
          { code: code.trim(), new_password: password },
          state.session.csrf_token,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setCode("");
        setPassword("");
        setConfirmation("");
        setStage("done");
      }
    } catch (error) {
      if (controller.signal.aborted) return;
      setMessage(failureMessage(error));
      if (error instanceof RequestError && error.code === 40380)
        setAvailability("disabled");
      if (error instanceof RequestError && error.code === 40310) void check();
    } finally {
      operation.current = null;
      if (!controller.signal.aborted) setBusy(false);
    }
  }

  return (
    <ManagementEntry
      cardRef={card}
      panel={{
        title: stage === "reset" ? "重置密码" : "找回密码",
        description:
          stage === "reset"
            ? "输入邮件中的重置码并设置新密码。"
            : "通过已验证的邮箱找回账号密码。",
      }}
    >
      {stage === "done" ? (
        <p role="status">
          <UiText text="密码已重置，请使用新密码登录。" />
        </p>
      ) : state.phase !== "ready" ? (
        <SessionFeedback
          error={state.phase === "failed" ? state.error : undefined}
          onRetry={() => void check()}
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
        <Form className="login-form" onSubmit={submit} aria-busy={busy}>
          {stage === "request" ? (
            <FormField id="recovery-identifier" label="用户名或邮箱">
              <TextField
                id="recovery-identifier"
                value={identifier}
                maxLength={254}
                autoComplete="username"
                autoCapitalize="none"
                required
                disabled={busy}
                onChange={(event) => setIdentifier(event.target.value)}
              />
            </FormField>
          ) : (
            <>
              {requested && (
                <p role="status">
                  <UiText text="如果账号存在且邮箱已验证，我们会发送重置码。请在当前浏览器中输入邮件里的重置码。" />
                </p>
              )}
              <FormField id="recovery-code" label="重置码">
                <TextField
                  id="recovery-code"
                  ref={codeField}
                  value={code}
                  autoComplete="one-time-code"
                  autoCapitalize="none"
                  spellCheck={false}
                  maxLength={32}
                  required
                  disabled={busy}
                  onChange={(event) => setCode(event.target.value.trim())}
                />
              </FormField>
              <FormField id="recovery-password" label="新密码">
                <PasswordField
                  id="recovery-password"
                  value={password}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  disabled={busy}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </FormField>
              <FormField id="recovery-confirmation" label="确认新密码">
                <PasswordField
                  id="recovery-confirmation"
                  value={confirmation}
                  autoComplete="new-password"
                  minLength={12}
                  maxLength={1024}
                  required
                  disabled={busy}
                  onChange={(event) => setConfirmation(event.target.value)}
                />
              </FormField>
            </>
          )}
          {message && (
            <p role="alert">
              <UiText text={message} />
            </p>
          )}
          <Button
            type="submit"
            className="management-primary login-submit"
            disabled={
              busy ||
              (stage === "request"
                ? !identifier.trim()
                : code.length !== 32 || !password || !confirmation)
            }
          >
            <span>
              <UiText
                text={
                  busy
                    ? "正在处理…"
                    : stage === "request"
                      ? "发送重置码"
                      : "重置密码"
                }
              />
            </span>
            <Icon name="arrow" />
          </Button>
          <Button
            className="login-back"
            disabled={busy}
            onClick={() => {
              setMessage("");
              setStage(stage === "request" ? "reset" : "request");
            }}
          >
            <UiText
              text={stage === "request" ? "我已收到重置码" : "重新请求重置码"}
            />
          </Button>
        </Form>
      )}
      <EntryFooter href="/login" label="返回账号登录" />
    </ManagementEntry>
  );
}
