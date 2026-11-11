"use client";

import { useId, useMemo, useState, type FormEvent } from "react";
import type {
  MailPreferences,
  MailSenderProfileInput,
  MailSenderProfileView,
} from "@/core/contracts/settings";
import { randomUUID } from "@/core/browser/crypto";
import { useMailSettings } from "@/core/settings/use-mail-settings";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { UiText, useT } from "@/core/i18n/provider";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { PasswordField } from "../../components/ui/password-field";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Icon } from "../../components/icon";
import { MailTestPanel } from "../settings/mail-test";
import styles from "./notifications.module.css";
import fieldStyles from "../settings/mail.module.css";

type Editor = ReturnType<typeof useMailSettings>;
type DraftProfile = MailSenderProfileInput;

type TextKey = "host" | "username" | "from_address" | "from_name" | "reply_to";

function ready(profile: MailSenderProfileView) {
  const value = profile.value;
  return !!(
    profile.enabled &&
    value.host &&
    value.from_address &&
    (!value.authenticate || (value.username && profile.password_configured))
  );
}

function ProfileCard({
  profile,
  passwordConfigured,
  selected,
  onSelect,
}: {
  profile: DraftProfile;
  passwordConfigured: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const available =
    profile.enabled &&
    !!profile.value.host &&
    !!profile.value.from_address &&
    (!profile.value.authenticate ||
      (!!profile.value.username && (passwordConfigured || !!profile.password)));
  return (
    <Button
      className={styles.mailProfileCard}
      aria-pressed={selected}
      data-current={selected || undefined}
      onClick={onSelect}
    >
      <span className={styles.mailProfileIcon}>
        <Icon name="mail" />
      </span>
      <span className={styles.mailProfileIdentity}>
        <strong>
          <UiText text={profile.name || "未命名配置"} />
        </strong>
        <small>
          <UiText text={profile.value.from_address || "尚未填写发件邮箱"} />
        </small>
      </span>
      <span className={styles.mailProfileFlags}>
        {profile.is_default && (
          <span className="admin-badge admin-badge-success">
            <UiText text="默认" />
          </span>
        )}
        <span className="admin-badge" data-disabled={!available || undefined}>
          <Icon name={available ? "check" : "cloud-off"} />
          <UiText text={available ? "可用" : "未就绪"} />
        </span>
      </span>
    </Button>
  );
}

export function MailProfilesPanel({ editor }: { editor: Editor }) {
  const id = useId(),
    t = useT(),
    account = useAdminAccount(),
    editable = can(account, "settings:write");
  const [selectedId, setSelectedId] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);
  const profiles = useMemo(() => editor.draft?.profiles ?? [], [editor.draft]);
  const activeId = profiles.some((profile) => profile.id === selectedId)
    ? selectedId
    : (profiles[0]?.id ?? "");
  const selected = profiles.find((profile) => profile.id === activeId);
  const savedProfile = editor.saved?.profiles.find(
    (profile) => profile.id === activeId,
  );
  const removeTarget = profiles.find((profile) => profile.id === removeId);
  const selectedIndex = selected
    ? profiles.findIndex((profile) => profile.id === selected.id)
    : -1;

  const update = (patch: Partial<DraftProfile>) => {
    if (!editor.draft || !selected) return;
    editor.setDraft({
      ...editor.draft,
      profiles: editor.draft.profiles.map((profile) =>
        profile.id === selected.id ? { ...profile, ...patch } : profile,
      ),
    });
  };
  const updateValue = (patch: Partial<MailPreferences>) => {
    if (!selected) return;
    update({ value: { ...selected.value, ...patch } });
  };
  const add = () => {
    if (!editor.draft || editor.draft.profiles.length >= 20) return;
    const profile: DraftProfile = {
      id: randomUUID(),
      name: "新邮件配置",
      enabled: false,
      is_default: editor.draft.profiles.length === 0,
      value: {
        enabled: false,
        host: "",
        port: 587,
        encryption: "starttls",
        authenticate: true,
        username: "",
        from_address: "",
        from_name: "",
        reply_to: "",
        timeout_seconds: 15,
      },
      password: "",
      clear_password: false,
    };
    editor.setDraft({
      ...editor.draft,
      profiles: [...editor.draft.profiles, profile],
    });
    setSelectedId(profile.id);
  };
  const duplicate = () => {
    if (!editor.draft || !selected || editor.draft.profiles.length >= 20)
      return;
    const copy: DraftProfile = {
      ...selected,
      id: randomUUID(),
      name: `${selected.name} 副本`,
      is_default: false,
      password: "",
      clear_password: false,
    };
    editor.setDraft({
      ...editor.draft,
      profiles: [...editor.draft.profiles, copy],
    });
    setSelectedId(copy.id);
  };
  const remove = () => {
    if (!editor.draft || !removeTarget) return false;
    let remaining = editor.draft.profiles.filter(
      (profile) => profile.id !== removeTarget.id,
    );
    if (removeTarget.is_default && remaining.length)
      remaining = remaining.map((profile, index) => ({
        ...profile,
        is_default: index === 0,
      }));
    editor.setDraft({ ...editor.draft, profiles: remaining });
    setSelectedId(remaining[0]?.id ?? "");
    return true;
  };
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void editor.save();
  };
  const text = (key: TextKey, label: string, placeholder: string) => (
    <div className="admin-settings-field">
      <label htmlFor={`${id}-${key}`}>
        <UiText text={label} />
      </label>
      <TextField
        id={`${id}-${key}`}
        value={selected?.value[key] ?? ""}
        type={key === "from_address" || key === "reply_to" ? "email" : "text"}
        required={
          !!selected?.enabled &&
          (key === "host" ||
            key === "from_address" ||
            (key === "username" && !!selected.value.authenticate))
        }
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
        onChange={(event) => updateValue({ [key]: event.target.value })}
      />
    </div>
  );
  const selectedReady =
    selected &&
    selected.enabled &&
    !!selected.value.host &&
    !!selected.value.from_address &&
    (!selected.value.authenticate ||
      (!!selected.value.username && !!savedProfile?.password_configured));

  return (
    <section id="mail-profiles" className={styles.mailProfilesSection}>
      <header className={styles.mailProfilesHeading}>
        <div>
          <span className={styles.sectionEyebrow}>
            <UiText text="邮件发信配置" />
          </span>
          <h2>
            <UiText text="发信账号与默认身份" />
          </h2>
          <p>
            <UiText text="每套配置使用独立的 SMTP 与发件人资料。提醒规则可以指定具体配置，未指定时使用默认配置。" />
          </p>
        </div>
        <Button
          className="admin-button admin-button-primary"
          disabled={
            !editable || editor.busy || editor.loading || profiles.length >= 20
          }
          onClick={add}
        >
          <Icon name="plus" />
          <UiText text="添加发信配置" />
        </Button>
      </header>

      {editor.loading && !editor.draft ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取邮件配置…" />
        </div>
      ) : (
        <>
          {editor.error && (
            <div className={styles.message} data-error="true" role="alert">
              <Icon name="warning" />
              <UiText text={editor.error} />
            </div>
          )}
          {editor.message && (
            <div className={styles.message} role="status">
              <Icon name="check" />
              <UiText text={editor.message} />
            </div>
          )}
          <div className={styles.mailProfileWorkspace}>
            <div className={styles.mailProfileList} aria-label={t("发信配置")}>
              {profiles.map((profile) => (
                <ProfileCard
                  key={profile.id}
                  profile={profile}
                  passwordConfigured={Boolean(
                    editor.saved?.profiles.find(
                      (saved) => saved.id === profile.id,
                    )?.password_configured,
                  )}
                  selected={profile.id === selected?.id}
                  onSelect={() => setSelectedId(profile.id)}
                />
              ))}
              {!profiles.length && (
                <div className={styles.mailProfileEmpty}>
                  <Icon name="mail" />
                  <strong>
                    <UiText text="尚未添加发信配置" />
                  </strong>
                  <span>
                    <UiText text="添加第一套 SMTP 配置后，邮件提醒和邮箱验证才能发送。" />
                  </span>
                  <Button
                    className="admin-button"
                    disabled={!editable}
                    onClick={add}
                  >
                    <Icon name="plus" />
                    <UiText text="添加第一套配置" />
                  </Button>
                </div>
              )}
            </div>

            {selected && editor.draft && (
              <Form
                id={`${id}-profile-form`}
                className={styles.mailProfileEditor}
                onSubmit={submit}
              >
                <fieldset
                  className={styles.mailEditorFieldset}
                  disabled={editor.busy || !editable}
                >
                  <header>
                    <div>
                      <span className={styles.sectionEyebrow}>
                        <UiText
                          text={`配置 ${selectedIndex + 1} / ${profiles.length}`}
                        />
                      </span>
                      <h3>
                        <UiText text={selected.name || "未命名发信配置"} />
                      </h3>
                    </div>
                    <div className={styles.mailEditorActions}>
                      {!selected.is_default && (
                        <Button
                          className="admin-button"
                          onClick={() => {
                            if (!editor.draft) return;
                            editor.setDraft({
                              ...editor.draft,
                              profiles: editor.draft.profiles.map(
                                (profile) => ({
                                  ...profile,
                                  is_default: profile.id === selected.id,
                                }),
                              ),
                            });
                          }}
                        >
                          <Icon name="check" />
                          <UiText text="设为默认" />
                        </Button>
                      )}
                      <Button
                        className="admin-button"
                        disabled={profiles.length >= 20}
                        onClick={duplicate}
                      >
                        <Icon name="copy" />
                        <UiText text="复制" />
                      </Button>
                      <Button
                        className="admin-button admin-button-danger"
                        onClick={() => setRemoveId(selected.id)}
                      >
                        <Icon name="trash" />
                        <UiText text="删除" />
                      </Button>
                    </div>
                  </header>

                  <div className={fieldStyles.grid}>
                    <div className="admin-settings-field">
                      <label htmlFor={`${id}-name`}>
                        <UiText text="配置名称" />
                      </label>
                      <TextField
                        id={`${id}-name`}
                        value={selected.name}
                        maxLength={80}
                        required
                        placeholder="例如：系统通知、客服邮箱"
                        onChange={(event) =>
                          update({ name: event.target.value })
                        }
                      />
                    </div>
                    <div className={styles.mailProfileToggles}>
                      <span>
                        <strong>
                          <UiText text="启用发信" />
                        </strong>
                        <small>
                          <UiText text="停用后不会自动改用其他配置。" />
                        </small>
                      </span>
                      <Switch
                        checked={!!selected.enabled}
                        aria-label={t("启用发信")}
                        onCheckedChange={(enabled) =>
                          update({
                            enabled,
                            value: {
                              ...selected.value,
                              enabled,
                            },
                          })
                        }
                      />
                    </div>
                  </div>

                  <div className={styles.mailEditorDivider} />
                  <div className={styles.mailEditorSectionHeading}>
                    <div>
                      <h4>
                        <UiText text="SMTP 连接" />
                      </h4>
                      <p>
                        <UiText text="参数以邮件服务商提供的连接信息为准。" />
                      </p>
                    </div>
                  </div>
                  <div className={fieldStyles.grid}>
                    {text("host", "SMTP 服务器", "smtp.example.com")}
                    <div className="admin-settings-field">
                      <label htmlFor={`${id}-port`}>
                        <UiText text="端口" />
                      </label>
                      <TextField
                        id={`${id}-port`}
                        type="number"
                        required
                        min={1}
                        max={65535}
                        step={1}
                        value={selected.value.port ?? 587}
                        onChange={(event) =>
                          updateValue({ port: Number(event.target.value) })
                        }
                      />
                    </div>
                    <div className="admin-settings-field">
                      <span>
                        <UiText text="连接加密" />
                      </span>
                      <Select
                        name={`${id}-encryption`}
                        label={t("连接加密")}
                        programOptions
                        value={selected.value.encryption ?? "starttls"}
                        options={[
                          {
                            value: "starttls",
                            label: "STARTTLS（通常 587）",
                          },
                          { value: "tls", label: "SSL/TLS（通常 465）" },
                          { value: "none", label: "不加密" },
                        ]}
                        onValueChange={(encryption) =>
                          updateValue({ encryption })
                        }
                      />
                    </div>
                    <div className="admin-settings-field">
                      <label htmlFor={`${id}-timeout`}>
                        <UiText text="连接超时（秒）" />
                      </label>
                      <TextField
                        id={`${id}-timeout`}
                        type="number"
                        required
                        min={3}
                        max={120}
                        step={1}
                        value={selected.value.timeout_seconds ?? 15}
                        onChange={(event) =>
                          updateValue({
                            timeout_seconds: Number(event.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  {selected.value.encryption === "none" && (
                    <p className={styles.mailWarning}>
                      <Icon name="warning" />
                      <UiText text="未加密连接会明文传输认证信息，请仅用于可信的本地中继。" />
                    </p>
                  )}
                  <div className={styles.mailProfileToggleRow}>
                    <span>
                      <strong>
                        <UiText text="服务器需要认证" />
                      </strong>
                      <small>
                        <UiText text="使用邮件服务商提供的用户名及密码或授权码。" />
                      </small>
                    </span>
                    <Switch
                      checked={selected.value.authenticate ?? true}
                      aria-label={t("服务器需要认证")}
                      onCheckedChange={(authenticate) =>
                        updateValue({ authenticate })
                      }
                    />
                  </div>
                  {selected.value.authenticate && (
                    <div className={fieldStyles.grid}>
                      {text("username", "SMTP 用户名", "")}
                      <div className="admin-settings-field">
                        <label htmlFor={`${id}-password`}>
                          <UiText text="SMTP 密码或授权码" />
                        </label>
                        <PasswordField
                          id={`${id}-password`}
                          value={selected.password ?? ""}
                          required={
                            !!selected.enabled &&
                            !!selected.value.authenticate &&
                            (!savedProfile?.password_configured ||
                              !!selected.clear_password)
                          }
                          maxLength={2048}
                          autoComplete="new-password"
                          placeholder={t(
                            savedProfile?.password_configured
                              ? "已配置，留空保留原密码"
                              : "填写邮件服务商提供的密码或授权码",
                          )}
                          onChange={(event) =>
                            update({
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
                  {savedProfile?.password_configured && (
                    <div className={fieldStyles.passwordAction}>
                      <Button
                        className="admin-button"
                        onClick={() =>
                          update({
                            password: "",
                            clear_password: !selected.clear_password,
                          })
                        }
                      >
                        <Icon
                          name={selected.clear_password ? "undo" : "trash"}
                        />
                        <UiText
                          text={
                            selected.clear_password
                              ? "撤销清除密码"
                              : "清除已保存的密码"
                          }
                        />
                      </Button>
                      {selected.clear_password && (
                        <small>
                          <UiText text="保存后清除；启用认证时请同时停用发信或填写新密码。" />
                        </small>
                      )}
                    </div>
                  )}

                  <div className={styles.mailEditorDivider} />
                  <div className={styles.mailEditorSectionHeading}>
                    <div>
                      <h4>
                        <UiText text="发件人身份" />
                      </h4>
                      <p>
                        <UiText text="发件地址应是邮件服务商允许使用的邮箱。" />
                      </p>
                    </div>
                  </div>
                  <div className={fieldStyles.grid}>
                    {text("from_address", "发件邮箱", "sender@example.com")}
                    {text("from_name", "发件人名称", "Everunfold")}
                    {text("reply_to", "回复邮箱（可选）", "reply@example.com")}
                  </div>
                  <p className={fieldStyles.hint}>
                    <UiText text="回复邮箱留空时使用发件邮箱。" />
                  </p>
                </fieldset>
              </Form>
            )}
          </div>

          {editor.draft && (
            <div className={styles.mailProfileSavebar}>
              <span>
                {editor.dirty ? (
                  <UiText text="有尚未保存的发信配置修改" />
                ) : (
                  <UiText
                    text="已读取版本 {revision}"
                    values={{ revision: editor.saved?.revision ?? 0 }}
                  />
                )}
              </span>
              <div className={styles.sectionActions}>
                <Button
                  className="admin-button"
                  disabled={!editor.dirty || editor.busy}
                  onClick={() => editor.reset()}
                >
                  <Icon name="undo" />
                  <UiText text="撤销修改" />
                </Button>
                <Button
                  type="submit"
                  form={`${id}-profile-form`}
                  className="admin-button admin-button-primary"
                  disabled={
                    !editable ||
                    !editor.dirty ||
                    editor.busy ||
                    !profiles.length
                  }
                >
                  <Icon name={editor.busy ? "refresh" : "save"} />
                  <UiText text={editor.busy ? "正在保存" : "保存发信配置"} />
                </Button>
              </div>
            </div>
          )}

          {savedProfile && !editor.dirty && selected && ready(savedProfile) && (
            <MailTestPanel
              key={savedProfile.id}
              saved={editor.saved!}
              profile={savedProfile}
              dirty={false}
              disabled={!editable || editor.busy || !selectedReady}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={removeId !== null}
        title="删除发信配置？"
        description={
          removeTarget
            ? `“${removeTarget.name}”及其保存的密码会从当前草稿中移除，保存后生效。仍被提醒规则使用的配置会被后端拒绝删除。`
            : undefined
        }
        icon="trash"
        intent="danger"
        confirmLabel="删除配置"
        onCancel={() => setRemoveId(null)}
        onConfirm={remove}
        onConfirmed={() => setRemoveId(null)}
      />
    </section>
  );
}
