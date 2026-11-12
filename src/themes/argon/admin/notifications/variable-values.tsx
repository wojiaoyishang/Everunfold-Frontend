"use client";

import { UiText, useT } from "@/core/i18n/provider";
import { Button, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./notifications.module.css";

export const notificationSampleValues: Record<string, string> = {
  "verification.code": "123456",
  "verification.expires_minutes": "15",
  "actor.name": "小灵",
  "recipient.display_name": "Alex",
  "event.id": "83f05ab3-485d-4d50-8823-355af9b5c53f",
  "event.occurred_at": "2026-11-12T09:30:00+00:00",
  "content.excerpt": "这是一条刚刚提交、正在等待审核的评论。",
  "content.title": "如何在秋日整理一间安静的书房",
  "content.type": "文章",
  "content.url": "/posts/autumn-study",
  "resource.title": "示例文章",
  "resource.url": "/posts/example",
  "resource.review_url": "/admin/comments",
  "comment.author_name": "小灵",
  "comment.excerpt": "这是一条刚刚提交、正在等待审核的评论。",
  "schedule.planned_at": "2026-11-12 09:30 UTC",
  "failure.reason": "path_conflict",
  "admin.url": "/admin/content/article/example/edit",
  "node.id": "web-main",
  "settings.resource": "公共站点设置",
};

export const variableLabels: Record<string, string> = {
  "site.name": "站点名称",
  "site.description": "站点描述",
  "site.author": "站点作者",
  "site.icon_url": "邮件图标地址",
  "site.url": "公开站点地址",
  "site.support_url": "邮件帮助链接",
  "site.accent_color": "邮件主题色",
  "site.accent_text_color": "主题色上的文字颜色",
  "recipient.display_name": "收件人显示名称",
  "mail.reason": "邮件发送原因",
  "event.id": "事件编号",
  "event.occurred_at": "事件发生时间",
  "actor.name": "评论作者",
  "content.excerpt": "评论摘要",
  "resource.title": "原文标题",
  "resource.url": "原文链接",
  "resource.review_url": "评论审核链接",
  "comment.author_name": "评论作者",
  "comment.excerpt": "评论摘要",
  "comment.review_url": "评论审核链接",
  "comment.approve_url": "通过评论确认链接",
  "comment.reject_url": "拒绝评论确认链接",
  "verification.code": "邮箱验证码",
  "verification.expires_minutes": "验证码有效分钟数",
  "verification.purpose": "邮箱验证用途",
};

export function templateSampleValues(
  platform: string,
  event: string,
  locale: string,
  site: Record<string, string>,
) {
  const english = locale.toLowerCase().split("-")[0] === "en";
  const reviewPath =
    "/admin/comments?comment=83f05ab3-485d-4d50-8823-355af9b5c53f";
  const accountSamples: Record<string, readonly string[]> = {
    "security.email_verification": [
      "验证邮箱",
      "Email verification",
      "你收到这封邮件是因为有人请求验证此邮箱。",
      "You received this email because verification was requested for this address.",
    ],
    "security.registration_verification": [
      "注册账号",
      "Account registration",
      "你收到这封邮件是因为有人使用此邮箱申请注册。",
      "You received this email because registration was requested for this address.",
    ],
    "security.password_recovery": [
      "找回密码",
      "Password recovery",
      "你收到这封邮件是因为有人请求重置账号密码。",
      "You received this email because a password reset was requested.",
    ],
    "security.password_reset_completed": [
      "",
      "",
      "这封邮件用于通知你账号密码已重置。",
      "You received this email to confirm that your password was reset.",
    ],
  };
  const accountSample = accountSamples[event];
  const origin = platform === "email" ? site.url || "https://example.com" : "";
  const values: Record<string, string> = {
    ...notificationSampleValues,
    ...Object.fromEntries(
      Object.entries(site).map(([key, value]) => [`site.${key}`, value]),
    ),
    "site.support_url": site.support_url || "https://example.com/help",
    "resource.review_url": origin + reviewPath,
    "comment.review_url": origin + reviewPath,
    "comment.approve_url": origin + reviewPath + "&action=approve",
    "comment.reject_url": origin + reviewPath + "&action=reject",
    "verification.code":
      event === "security.password_recovery"
        ? "ExampleRecoveryCode1234567890abc"
        : notificationSampleValues["verification.code"],
    "verification.expires_minutes": "15",
    "verification.purpose": accountSample?.[english ? 1 : 0] ?? "",
    "mail.reason":
      accountSample?.[english ? 3 : 2] ??
      (english
        ? "You received this email because the site sends you this notification."
        : "你收到这封邮件是因为站点为你配置了这项通知。"),
  };
  for (const key of ["resource.url", "content.url", "admin.url"] as const) {
    values[key] = origin + notificationSampleValues[key];
  }
  return values;
}

export function NotificationVariableValues({
  variables,
  values,
  onChange,
  onReset,
  disabled,
}: {
  variables: string[];
  values: Record<string, string>;
  onChange: (variable: string, value: string) => void;
  onReset: () => void;
  disabled?: boolean;
}) {
  const t = useT();
  return (
    <section className={styles.variableFill}>
      <div className={styles.variableFillHeading}>
        <span>
          <UiText text="仅影响预览，不写入模板" />
        </span>
        <Button
          className={styles.variableReset}
          disabled={disabled}
          onClick={onReset}
        >
          <Icon name="undo" />
          <UiText text="恢复示例" />
        </Button>
      </div>
      <div className={styles.variableFillList}>
        {variables.map((variable) => (
          <label key={variable}>
            {variableLabels[variable] && (
              <strong>
                <UiText text={variableLabels[variable]} />
              </strong>
            )}
            <span>{`{{${variable}}}`}</span>
            <TextField
              value={values[variable] ?? ""}
              aria-label={t("填充变量 {variable}", { variable })}
              placeholder={t("按事件提供")}
              disabled={disabled}
              onChange={(event) => onChange(variable, event.target.value)}
            />
          </label>
        ))}
      </div>
    </section>
  );
}
