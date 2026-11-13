"use client";

import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { accountFailure, useAccountAction } from "@/core/accounts/use-action";
import {
  readAccountNotificationPreferences,
  saveAccountNotificationPreferences,
  type NotificationPreferences as Preferences,
} from "@/core/contracts/notifications";
import { UiText } from "@/core/i18n/provider";
import { SettingsToggle } from "../admin/settings/shared";
import { Button } from "../components/ui/primitives";

export function NotificationPreferences({
  emailVerified,
}: {
  emailVerified: boolean;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const action = useAccountAction();
  useEffect(() => {
    const controller = new AbortController();
    void readAccountNotificationPreferences(baseUrl, {
      signal: controller.signal,
    })
      .then(({ data }) => {
        if (!controller.signal.aborted) setPreferences(data);
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, csrfToken, attempt]);

  return (
    <section className="account-card">
      <header>
        <h2>
          <UiText text="评论回复" />
        </h2>
        <p>
          <UiText text="登录后发表的评论收到公开回复时，可在通知中心查看。" />
        </p>
      </header>
      {preferences ? (
        <SettingsToggle
          label="通过邮件接收评论回复"
          hint={
            emailVerified
              ? "邮件发送到当前已验证的邮箱。"
              : "请先在个人资料中验证邮箱。"
          }
          value={preferences.comment_reply_email}
          disabled={
            action.busy || (!emailVerified && !preferences.comment_reply_email)
          }
          onChange={(comment_reply_email) =>
            void action.run(async (signal) => {
              const { data } = await saveAccountNotificationPreferences(
                baseUrl,
                { comment_reply_email },
                csrfToken,
                { signal },
              );
              if (!signal.aborted) setPreferences(data);
            })
          }
        />
      ) : error ? (
        <div role="alert">
          <UiText text={error} />
          <Button
            className="admin-button"
            onClick={() => {
              setError("");
              setAttempt((value) => value + 1);
            }}
          >
            <UiText text="重新读取" />
          </Button>
        </div>
      ) : (
        <p role="status">
          <UiText text="正在读取通知偏好…" />
        </p>
      )}
      {action.message && (
        <p role="status">
          <UiText text={action.message} />
        </p>
      )}
    </section>
  );
}
