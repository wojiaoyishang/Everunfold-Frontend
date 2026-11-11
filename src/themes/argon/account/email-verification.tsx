"use client";

import { useId, useState } from "react";
import type { AccountProfile } from "@/core/contracts/accounts";
import {
  confirmAccountEmailVerification,
  requestAccountEmailVerification,
} from "@/core/contracts/accounts";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction } from "@/core/accounts/use-action";
import { UiText, useT } from "@/core/i18n/provider";
import { RequestError } from "@/core/http/request";
import { Button, TextField } from "../components/ui/primitives";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Icon } from "../components/icon";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function EmailVerificationControl({
  email,
  verified,
  disabled,
  onVerified,
}: {
  email: string;
  verified: boolean;
  disabled: boolean;
  onVerified: (profile: AccountProfile) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const t = useT();
  const codeId = useId();
  const request = useAccountAction(requestFailure);
  const confirm = useAccountAction(confirmFailure);
  const [dialog, setDialog] = useState(false);
  const [requestId, setRequestId] = useState("");
  const [code, setCode] = useState("");
  const normalized = email.trim();
  const ready = emailPattern.test(normalized);
  const start = async () => {
    if (!ready || verified || request.busy) return;
    await request.run(async (signal) => {
      const response = await requestAccountEmailVerification(
        baseUrl,
        {
          operation_id: request.operation({ email: normalized }),
          email: normalized,
        },
        csrfToken,
        { signal },
      );
      if (!signal.aborted) {
        setRequestId(response.data.request_id);
        setCode("");
        setDialog(true);
      }
    }, "验证码已进入发送队列，请查看邮箱。");
  };
  return (
    <>
      <div className="account-email-verification">
        <Button
          type="button"
          className="admin-button account-email-verify"
          disabled={disabled || verified || !ready || request.busy}
          onClick={() => void start()}
        >
          <Icon name={verified ? "check" : "mail"} />
          <UiText
            text={verified ? "已验证" : request.busy ? "正在发送…" : "验证邮箱"}
          />
        </Button>
        {request.message && (
          <small role="status" className="account-field-hint">
            <UiText text={request.message} />
          </small>
        )}
      </div>
      <ConfirmDialog
        open={dialog}
        title="输入邮箱验证码"
        description={
          <UiText
            text="验证码已发送至 {email}。验证码 15 分钟内有效，最多尝试 5 次。"
            values={{ email: normalized }}
          />
        }
        confirmLabel="确认验证"
        busyLabel="正在验证…"
        busy={confirm.busy}
        confirmDisabled={code.length !== 6}
        submitOnEnter
        error={confirm.message ? t(confirm.message) : ""}
        onCancel={() => setDialog(false)}
        onConfirm={() =>
          confirm.run(async (signal) => {
            const response = await confirmAccountEmailVerification(
              baseUrl,
              {
                request_id: requestId,
                email: normalized,
                code,
              },
              csrfToken,
              { signal },
            );
            if (!signal.aborted) {
              request.setMessage("邮箱已验证。");
              onVerified(response.data);
            }
          }, "邮箱已验证。")
        }
        onConfirmed={() => setDialog(false)}
      >
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
            placeholder="000000"
            onChange={(event) =>
              setCode(event.target.value.replace(/\D/g, "").slice(0, 6))
            }
          />
        </label>
        <p className="account-field-hint">
          <UiText text="如果暂未收到，可等待片刻后关闭窗口并重新点击“验证邮箱”。" />
        </p>
      </ConfirmDialog>
    </>
  );
}

function requestFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 42972) return "验证码发送过于频繁，请稍后再试。";
    if (error.code === 42272) return "请先配置并启用可用的 SMTP 邮件平台。";
  }
  return "验证码请求未完成，请检查连接后重试。";
}

function confirmFailure(error: unknown) {
  if (error instanceof RequestError) {
    if (error.code === 42273) return "验证码不正确或已过期，请重新发送。";
    if (error.code === 40973) return "验证码仍在发送，请稍后重试。";
    if (error.code === 40974) return "账号资料已修改，请重新发起验证。";
  }
  return "邮箱验证未完成，请检查连接后重试。";
}
