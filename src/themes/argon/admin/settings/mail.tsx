"use client";
import { useId, useState } from "react";
import type { MailPreferences } from "@/core/contracts/settings";
import { useMailSettings } from "@/core/settings/use-mail-settings";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { PasswordField } from "../../components/ui/password-field";
import { Select } from "../../components/ui/select";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "./section-navigation";
import { SettingsSection, SettingsToggle } from "./shared";
import styles from "./mail.module.css";

export function MailSettingsPage() {
  const editor = useMailSettings(),
    id = useId(),
    t = useT();
  const editable = can(useAdminAccount(), "settings:write");
  const [confirmReload, setConfirmReload] = useState(false);
  const { draft, saved } = editor;
  const update = (value: Partial<MailPreferences>) =>
    editor.setDraft((current) =>
      current ? { ...current, value: { ...current.value, ...value } } : current,
    );
  const text = (
    key: "host" | "username" | "from_address" | "from_name" | "reply_to",
    label: string,
    placeholder = "",
  ) => (
    <div className="admin-settings-field">
      <label htmlFor={`${id}-${key}`}>
        <UiText text={label} />
      </label>
      <TextField
        id={`${id}-${key}`}
        value={draft?.value[key] ?? ""}
        autoComplete="off"
        placeholder={placeholder}
        maxLength={
          key === "host"
            ? 253
            : key === "from_name"
              ? 200
              : key === "username"
                ? 320
                : 254
        }
        onChange={(event) => update({ [key]: event.target.value })}
      />
    </div>
  );
  return (
    <SettingsLayout>
      <UnsavedAccountChanges dirty={editor.dirty} busy={editor.busy} />
      <AdminPageHeading
        title="邮件配置"
        description="配置用于后续邮件发送。本阶段仅保存设置，不连接 SMTP 或发送邮件。"
      />
      {editor.loading ? (
        <p role="status">
          <UiText text="正在读取设置…" />
        </p>
      ) : (
        draft &&
        saved && (
          <Form
            onSubmit={(event) => {
              event.preventDefault();
              void editor.save();
            }}
          >
            <fieldset
              className="admin-settings-form"
              disabled={editor.busy || !editable}
            >
              <SettingsSection
                id="mail-connection"
                title="SMTP 连接"
                description="服务器及加密方式以邮件服务商提供的参数为准。"
              >
                <SettingsToggle
                  label="允许邮件发送"
                  hint="关闭时保留配置，后续发送服务将遵循此开关。"
                  value={draft.value.enabled ?? false}
                  onChange={(enabled) => update({ enabled })}
                />
                <div className={styles.grid}>
                  {text("host", "SMTP 服务器", "smtp.example.com")}
                  <div className="admin-settings-field">
                    <label htmlFor={`${id}-port`}>
                      <UiText text="端口" />
                    </label>
                    <TextField
                      id={`${id}-port`}
                      type="number"
                      min={1}
                      max={65535}
                      step={1}
                      value={draft.value.port ?? 587}
                      onChange={(e) => update({ port: Number(e.target.value) })}
                    />
                  </div>
                  <div className="admin-settings-field">
                    <span>
                      <UiText text="连接加密" />
                    </span>
                    <Select
                      name="mail-encryption"
                      label="连接加密"
                      programOptions
                      value={draft.value.encryption ?? "starttls"}
                      options={[
                        { value: "starttls", label: "STARTTLS（通常 587）" },
                        { value: "tls", label: "SSL/TLS（通常 465）" },
                        { value: "none", label: "不加密" },
                      ]}
                      onValueChange={(encryption) => update({ encryption })}
                    />
                  </div>
                  <div className="admin-settings-field">
                    <label htmlFor={`${id}-timeout`}>
                      <UiText text="连接超时（秒）" />
                    </label>
                    <TextField
                      id={`${id}-timeout`}
                      type="number"
                      min={3}
                      max={120}
                      step={1}
                      value={draft.value.timeout_seconds ?? 15}
                      onChange={(e) =>
                        update({ timeout_seconds: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                {draft.value.encryption === "none" && (
                  <p className={styles.hint}>
                    <Icon name="warning" />
                    <UiText text="未加密连接会明文传输认证信息，请仅用于可信的本地中继。" />
                  </p>
                )}
                <SettingsToggle
                  label="服务器需要认证"
                  hint="使用邮件服务商提供的用户名及密码或授权码。"
                  value={draft.value.authenticate ?? true}
                  onChange={(authenticate) => update({ authenticate })}
                />
                {draft.value.authenticate && (
                  <div className={styles.grid}>
                    {text("username", "SMTP 用户名")}
                    <div className="admin-settings-field">
                      <label htmlFor={`${id}-password`}>
                        <UiText text="SMTP 密码或授权码" />
                      </label>
                      <PasswordField
                        id={`${id}-password`}
                        value={draft.password ?? ""}
                        maxLength={2048}
                        autoComplete="new-password"
                        placeholder={t(
                          saved.password_configured
                            ? "已配置，留空保留原密码"
                            : "填写邮件服务商提供的密码或授权码",
                        )}
                        onChange={(event) =>
                          editor.setDraft({
                            ...draft,
                            password: event.target.value,
                            clear_password: false,
                          })
                        }
                      />
                      <small>
                        <UiText text="密码仅在后端保存，不会回显给浏览器。" />
                      </small>
                    </div>
                  </div>
                )}
                {saved.password_configured && (
                  <div className={styles.passwordAction}>
                    <Button
                      className="admin-button"
                      onClick={() =>
                        editor.setDraft({
                          ...draft,
                          password: "",
                          clear_password: !draft.clear_password,
                        })
                      }
                    >
                      <Icon name={draft.clear_password ? "undo" : "trash"} />
                      <UiText
                        text={
                          draft.clear_password
                            ? "撤销清除密码"
                            : "清除已保存的密码"
                        }
                      />
                    </Button>
                    {draft.clear_password && (
                      <small>
                        <UiText text="保存后清除；开启认证时请同时关闭发送或填写新密码。" />
                      </small>
                    )}
                  </div>
                )}
              </SettingsSection>
              <SettingsSection
                id="mail-sender"
                title="发件人"
                description="发件地址应是邮件服务商允许使用的邮箱。"
              >
                <div className={styles.grid}>
                  {text("from_address", "发件邮箱", "sender@example.com")}
                  {text("from_name", "发件人名称", "Everunfold")}
                  {text("reply_to", "回复邮箱（可选）", "reply@example.com")}
                </div>
                <p className={styles.hint}>
                  <UiText text="回复邮箱留空时使用发件邮箱。" />
                </p>
              </SettingsSection>
            </fieldset>
            {editor.message && (
              <p role="status" className="admin-settings-message">
                <UiText text={editor.message} />
              </p>
            )}
            <div className="admin-settings-savebar">
              <span>
                <UiText
                  text={
                    editor.dirty
                      ? "有尚未保存的修改"
                      : saved.revision
                        ? "已保存"
                        : "尚未配置"
                  }
                />
              </span>
              <div className="admin-settings-actions">
                <Button
                  className="admin-button"
                  disabled={editor.busy || !editor.dirty}
                  onClick={editor.reset}
                >
                  <Icon name="undo" />
                  <UiText text="撤销修改" />
                </Button>
                <Button
                  type="submit"
                  className="admin-button admin-button-primary"
                  disabled={!editable || editor.busy || !editor.dirty}
                >
                  <Icon name={editor.busy ? "refresh" : "save"} />
                  <UiText text={editor.busy ? "正在保存" : "保存配置"} />
                </Button>
              </div>
            </div>
          </Form>
        )
      )}
      {editor.error && (
        <div role="alert" className="admin-settings-message is-error">
          <p>
            <UiText text={editor.error} />
          </p>
          <Button
            className="admin-button"
            disabled={editor.busy}
            onClick={() =>
              editor.dirty ? setConfirmReload(true) : void editor.reload()
            }
          >
            <Icon name="refresh" />
            <UiText text="重新读取" />
          </Button>
        </div>
      )}
      <ConfirmDialog
        open={confirmReload}
        title="放弃未保存的修改？"
        description="重新读取会丢弃当前输入，包括尚未保存的密码。"
        confirmLabel="放弃修改并重新读取"
        onCancel={() => setConfirmReload(false)}
        onConfirm={() => true}
        onConfirmed={() => {
          setConfirmReload(false);
          void editor.reload();
        }}
      />
    </SettingsLayout>
  );
}
