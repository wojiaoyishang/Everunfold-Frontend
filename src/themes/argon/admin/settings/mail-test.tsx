"use client";
import { useId, useState } from "react";
import type { MailSettingsState } from "@/core/contracts/settings";
import { useMailTest } from "@/core/settings/use-mail-test";
import { UiText } from "@/core/i18n/provider";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { SettingsSection } from "./shared";
import styles from "./mail.module.css";

const failures: Record<string, string> = {
  authentication: "SMTP 认证失败，请检查用户名及密码或授权码。",
  tls: "TLS 连接验证失败，请检查服务器及证书。",
  unsupported: "服务器不支持所选加密或认证方式。",
  sender_rejected: "服务器拒绝发件地址，请检查发件人设置。",
  recipient_rejected: "服务器拒绝收件地址，请核对测试邮箱。",
  message_rejected: "服务器拒绝了测试邮件。",
  configuration_changed: "排队期间配置已改变，本次测试已取消，请重新测试。",
  queue_timeout: "等待发送超时，请检查运行与任务中的 Scheduler 和 Worker。",
  connection: "无法完成 SMTP 连接，请检查地址、端口及网络。",
};
export function MailTestPanel({
  saved,
  dirty,
  disabled,
}: {
  saved: MailSettingsState;
  dirty: boolean;
  disabled: boolean;
}) {
  const test = useMailTest(),
    id = useId();
  const [recipient, setRecipient] = useState("");
  const value = saved.value;
  const ready = !!(
    value.host &&
    value.from_address &&
    (!value.authenticate || (value.username && saved.password_configured))
  );
  const status = test.job?.status;
  return (
    <SettingsSection
      id="mail-test"
      title="测试发件"
      description="向指定邮箱发送一封固定内容的测试邮件，使用已保存的配置；不会开启自动发送。"
    >
      <Form
        className={styles.testForm}
        onSubmit={(event) => {
          event.preventDefault();
          void test.send(recipient, saved.revision);
        }}
      >
        <div className="admin-settings-field">
          <label htmlFor={id}>
            <UiText text="测试收件邮箱" />
          </label>
          <TextField
            id={id}
            type="email"
            required
            maxLength={254}
            placeholder="reader@example.com"
            value={recipient}
            disabled={disabled || test.busy || test.running || test.unconfirmed}
            onChange={(event) => setRecipient(event.target.value)}
          />
        </div>
        <Button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={
            disabled ||
            test.busy ||
            test.running ||
            (!test.unconfirmed && (dirty || !ready))
          }
        >
          <Icon name={test.busy || test.running ? "refresh" : "send"} />
          <UiText
            text={
              test.unconfirmed
                ? "确认请求"
                : test.busy || test.running
                  ? "正在处理"
                  : "发送测试邮件"
            }
          />
        </Button>
      </Form>
      {(dirty || !ready) && (
        <p className={styles.hint}>
          <UiText
            text={
              dirty
                ? "请先保存修改，再测试发件。"
                : "请先保存完整的 SMTP 配置，再测试发件。"
            }
          />
        </p>
      )}
      {test.error && (
        <p role="alert" className="admin-settings-message is-error">
          <UiText text={test.error} />
        </p>
      )}
      {test.job && (
        <div
          role="status"
          className={`${styles.testResult} admin-settings-message ${status === "failed" || status === "unknown" ? "is-error" : ""}`}
        >
          <Icon
            name={
              status === "sent"
                ? "check"
                : status === "failed" || status === "unknown"
                  ? "warning"
                  : "refresh"
            }
          />
          <span>
            <UiText
              text={
                status === "sent"
                  ? "邮件服务器已接收，请检查收件箱和垃圾邮件。"
                  : status === "unknown"
                    ? "发送结果未知，请检查收件箱后再决定是否重发。"
                    : status === "failed"
                      ? (failures[test.job.error ?? ""] ??
                        "测试发送失败，请检查邮件配置。")
                      : status === "sending"
                        ? "正在连接邮件服务器并发送…"
                        : "测试邮件已排队，等待 Worker 发送…"
              }
            />{" "}
            <span>{test.job.recipient}</span>
          </span>
          {(test.running || test.paused) && (
            <Button
              className="admin-button"
              disabled={test.busy}
              onClick={() => void test.refresh()}
            >
              <Icon name="refresh" />
              <UiText text="刷新状态" />
            </Button>
          )}
        </div>
      )}
    </SettingsSection>
  );
}
