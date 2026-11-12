"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  AccountProfile,
  EmailVerificationState,
} from "@/core/contracts/accounts";
import {
  confirmAccountEmailVerification,
  readAccountEmailVerification,
  requestAccountEmailVerification,
} from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import { captchaFailure, useCaptcha } from "@/core/captcha/use-captcha";
import { UiText, useT } from "@/core/i18n/provider";
import { RequestError } from "@/core/http/request";
import { Button, TextField } from "../components/ui/primitives";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { CaptchaField } from "../components/captcha-field";
import { Icon } from "../components/icon";
import { AccountField } from "./fields";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const statusText: Record<EmailVerificationState["status"], string> = {
  queued: "等待发送。",
  sending: "正在发送验证码。",
  sent: "邮件服务器已接收验证码，请查收。",
  failed: "验证码发送失败，可以在冷却结束后重发。",
  unknown: "无法确认邮件是否送达，请在冷却结束后重发。",
  expired: "验证码已过期或失效，请重新发送。",
  verified: "邮箱已验证。",
};

export function EmailVerificationStatus({
  source,
}: {
  source?: AccountProfile["email_verification_source"];
}) {
  if (!source) return null;
  return (
    <span className="admin-badge admin-badge-success account-email-status">
      <Icon name="check" />
      <UiText text={source === "mailbox" ? "已验证" : "人工通过"} />
    </span>
  );
}

export function EmailVerificationControl({
  email,
  source,
  disabled,
  onVerified,
}: {
  email: string;
  source?: AccountProfile["email_verification_source"];
  disabled: boolean;
  onVerified: (profile: AccountProfile) => void;
}) {
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        ref={trigger}
        type="button"
        className="admin-button account-email-verify"
        disabled={disabled}
        onClick={() => setOpen(true)}
      >
        <Icon name="mail" />
        <UiText text={source === "mailbox" ? "更换邮箱" : "验证邮箱"} />
      </Button>
      {open && (
        <VerificationDialog
          email={source === "mailbox" ? "" : email}
          trigger={trigger}
          onClose={() => setOpen(false)}
          onVerified={onVerified}
        />
      )}
    </>
  );
}

function VerificationDialog({
  email,
  trigger,
  onClose,
  onVerified,
}: {
  email: string;
  trigger: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  onVerified: (profile: AccountProfile) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const t = useT();
  const codeId = useId();
  const captcha = useCaptcha(baseUrl, "email_verification");
  const request = useAccountAction(requestFailure);
  const confirm = useAccountAction(confirmFailure);
  const [destination, setDestination] = useState(email);
  const [delivery, setDelivery] = useState<EmailVerificationState | null>(null);
  const [code, setCode] = useState("");
  const [retryAt, setRetryAt] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [pollError, setPollError] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);
  const normalized = destination.trim();
  const requestId = delivery?.request_id;
  const pending =
    delivery?.status === "queued" || delivery?.status === "sending";
  const busy = request.busy || confirm.busy;
  const sendEnabled =
    !busy && captcha.ready && !remaining && emailPattern.test(normalized);

  useEffect(() => {
    if (!retryAt) return;
    const timer = window.setInterval(
      () => setRemaining(Math.max(0, Math.ceil((retryAt - Date.now()) / 1000))),
      250,
    );
    return () => window.clearInterval(timer);
  }, [retryAt]);

  useEffect(() => {
    if (!requestId || !pending) return;
    const controller = new AbortController();
    let timer: number;
    async function check() {
      try {
        const response = await readAccountEmailVerification(
          baseUrl,
          requestId!,
          {
            signal: controller.signal,
          },
        );
        if (controller.signal.aborted) return;
        setDelivery(response.data);
        setPollError(false);
        if (
          response.data.status === "queued" ||
          response.data.status === "sending"
        )
          timer = window.setTimeout(() => void check(), 2000);
      } catch {
        if (!controller.signal.aborted) setPollError(true);
      }
    }
    timer = window.setTimeout(() => void check(), 1200);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [baseUrl, pending, pollVersion, requestId]);

  useEffect(() => {
    if (delivery?.status !== "sent") return;
    const timer = window.setTimeout(
      () =>
        setDelivery((current) =>
          current === delivery ? { ...delivery, status: "expired" } : current,
        ),
      Math.max(0, Date.parse(delivery.expires_at) - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [delivery]);

  async function send() {
    if (!sendEnabled) return;
    await request.run(async (signal) => {
      try {
        const response = await requestAccountEmailVerification(
          baseUrl,
          {
            operation_id: request.operation({ email: normalized }),
            email: normalized,
            captcha: captcha.response,
          },
          csrfToken,
          { signal },
        );
        if (signal.aborted) return;
        setDelivery(response.data);
        setCode("");
        setPollError(false);
        startCooldown(response.data.retry_after_seconds);
      } catch (error) {
        if (
          !signal.aborted &&
          error instanceof RequestError &&
          error.code === 42972 &&
          error.retryAfterSeconds
        ) {
          startCooldown(error.retryAfterSeconds);
        }
        throw error;
      }
    }, "");
    void captcha.refresh();
  }

  function startCooldown(seconds: number) {
    setRemaining(seconds);
    setRetryAt(Date.now() + seconds * 1000);
  }

  return (
    <ConfirmDialog
      open
      title="验证邮箱"
      description="向此地址发送一次性验证码。验证码有效期为 15 分钟。"
      confirmLabel="确认验证"
      busyLabel={request.busy ? "确认验证" : "正在验证…"}
      busy={busy}
      confirmDisabled={delivery?.status !== "sent" || code.length !== 6}
      submitOnEnter
      error={confirm.message ? t(confirm.message) : ""}
      returnFocus={trigger}
      onCancel={onClose}
      onConfirm={() =>
        confirm.run(async (signal) => {
          if (!delivery) return;
          try {
            const response = await confirmAccountEmailVerification(
              baseUrl,
              { request_id: delivery.request_id, email: delivery.email, code },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) onVerified(response.data);
          } catch (error) {
            if (error instanceof RequestError && error.code === 42273) {
              setCode("");
              const current = await readAccountEmailVerification(
                baseUrl,
                delivery.request_id,
                { signal },
              ).catch(() => null);
              if (current && !signal.aborted) setDelivery(current.data);
            }
            throw error;
          }
        }, "")
      }
      onConfirmed={onClose}
    >
      <div className="account-email-dialog">
        <AccountField
          label="邮箱"
          value={destination}
          onChange={(value) => {
            setDestination(value);
            setDelivery(null);
            setCode("");
            setPollError(false);
            request.setMessage("");
            confirm.setMessage("");
          }}
          disabled={busy}
          type="email"
          autoComplete="email"
          maxLength={254}
        />
        <CaptchaField control={captcha} appearance="dialog" disabled={busy} />
        <div className="account-email-dialog-actions">
          <Button
            type="button"
            className="admin-button"
            disabled={!sendEnabled}
            onClick={() => void send()}
          >
            <UiText
              text={
                request.busy
                  ? "正在提交…"
                  : delivery
                    ? "重发验证码"
                    : "发送验证码"
              }
            />
          </Button>
          {remaining > 0 && (
            <span>
              <UiText
                text="{seconds} 秒后可重发"
                values={{ seconds: String(remaining) }}
              />
            </span>
          )}
        </div>
        {request.message && (
          <p role="alert">
            <UiText text={request.message} />
          </p>
        )}
        {delivery && (
          <p role="status">
            <UiText text={statusText[delivery.status]} />
          </p>
        )}
        {pollError && (
          <Button
            type="button"
            className="admin-button"
            onClick={() => setPollVersion((value) => value + 1)}
          >
            <UiText text="重新读取发送状态" />
          </Button>
        )}
        {delivery && (
          <label className="account-field" htmlFor={codeId}>
            <span>
              <UiText text="6 位验证码" />
            </span>
            <TextField
              id={codeId}
              value={code}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              pattern="[0-9]{6}"
              disabled={busy || delivery.status !== "sent"}
              onChange={(event) =>
                setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
              }
            />
          </label>
        )}
      </div>
    </ConfirmDialog>
  );
}

function requestFailure(error: unknown) {
  if (error instanceof RequestError) {
    if ([40386, 40387, 40986, 42986, 50386].includes(error.code ?? 0))
      return captchaFailure(error);
    if (error.code === 42972) return "验证码发送过于频繁，请稍后再试。";
    if (error.code === 42272) return "邮件服务暂不可用，请联系站点管理员。";
  }
  return accountFailure(error);
}

function confirmFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 42273) return "验证码不正确、已失效或已达到尝试上限。";
    if (error.code === 40973) return "验证码仍在发送，请稍后重试。";
    if (error.code === 40974) return "账号资料已更新，请重新申请验证码。";
    if (error.code === 40975) return "此邮箱无法绑定，请使用其他邮箱。";
  }
  return accountFailure(error);
}
