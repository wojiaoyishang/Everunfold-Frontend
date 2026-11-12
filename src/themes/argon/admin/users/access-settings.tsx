"use client";

import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { useAccessSettings } from "@/core/accounts/use-access-settings";
import { UiText } from "@/core/i18n/provider";
import { Button, Form } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { RouteLink } from "../../components/ui/route-link";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "../settings/section-navigation";
import { SettingsSection } from "../settings/shared";
import { RegistrationInvitations } from "./registration-invitations";

export function AccessSettingsPage() {
  const user = useAdminAccount();
  const { draft, saved, setDraft, save, busy, message, error, reload } =
    useAccessSettings();
  const captchaHref =
    can(user, "settings:read") && can(user, "settings:write")
      ? "/admin/settings/system#captcha-account"
      : "/admin/access/captcha";
  const dirty =
    !!draft &&
    !!saved &&
    (draft.registration_mode !== saved.registration_mode ||
      draft.mail_profile_id !== saved.mail_profile_id);
  return (
    <SettingsLayout>
      <AdminPageHeading title="访问与安全" />
      <UnsavedAccountChanges dirty={dirty} busy={busy} />
      <SettingsSection
        id="access-login"
        title="人机验证"
        description="登录、注册和邮箱发码的人机验证规则在验证码配置中管理。"
      >
        <RouteLink href={captchaHref} className="admin-settings-link">
          <UiText text="前往验证码配置" />
        </RouteLink>
      </SettingsSection>
      {draft ? (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            if (dirty)
              save({
                registration_mode: draft.registration_mode,
                mail_profile_id: draft.mail_profile_id,
              });
          }}
        >
          <fieldset className="account-fieldset" disabled={busy}>
            <SettingsSection
              id="access-registration"
              title="注册"
              description="新账号在邮箱验证通过后创建。"
            >
              <div className="admin-settings-field">
                <label htmlFor="registration-mode">
                  <UiText text="注册方式" />
                </label>
                <Select
                  id="registration-mode"
                  name="registration-mode"
                  label="注册方式"
                  className="admin-access-select"
                  programOptions
                  value={draft.registration_mode}
                  options={[
                    { value: "closed", label: "关闭注册" },
                    { value: "invite", label: "仅限邀请" },
                    { value: "open", label: "开放注册" },
                  ]}
                  onValueChange={(mode) => {
                    if (
                      mode === "closed" ||
                      mode === "invite" ||
                      mode === "open"
                    )
                      setDraft({ ...draft, registration_mode: mode });
                  }}
                />
              </div>
            </SettingsSection>
            <SettingsSection
              id="access-email"
              title="邮箱验证"
              description="选择发送邮箱验证码时使用的发信配置。"
            >
              <div className="admin-settings-field">
                <label htmlFor="access-sender">
                  <UiText text="认证邮件发信配置" />
                </label>
                <Select
                  id="access-sender"
                  name="access-sender"
                  label="认证邮件发信配置"
                  className="admin-access-select"
                  value={draft.mail_profile_id ?? "default"}
                  options={[
                    { value: "default", label: "使用默认发信配置" },
                    ...draft.mail_profiles.map(({ id, name }) => ({
                      value: id,
                      label: name,
                    })),
                    ...(draft.mail_profile_id &&
                    !draft.mail_profiles.some(
                      ({ id }) => id === draft.mail_profile_id,
                    )
                      ? [
                          {
                            value: draft.mail_profile_id,
                            label: "已选配置不可用",
                          },
                        ]
                      : []),
                  ]}
                  onValueChange={(sender) =>
                    setDraft({
                      ...draft,
                      mail_profile_id: sender === "default" ? null : sender,
                    })
                  }
                />
              </div>
              {saved && !saved.mail_ready && (
                <p role="status">
                  <UiText text="当前认证邮件发信配置不可用。" />
                </p>
              )}
              <RouteLink
                href="/admin/notifications/platforms"
                className="admin-button"
              >
                <UiText text="查看发信配置" />
              </RouteLink>
            </SettingsSection>
            <div className="account-actions">
              <Button
                type="submit"
                className="admin-button admin-button-primary"
                disabled={!dirty}
              >
                <UiText text="保存设置" />
              </Button>
              {message && (
                <span role="status">
                  <UiText text={message} />
                </span>
              )}
            </div>
          </fieldset>
        </Form>
      ) : error ? (
        <div role="alert">
          <UiText text={error} />
          <Button className="admin-button" onClick={reload}>
            <UiText text="重新读取" />
          </Button>
        </div>
      ) : (
        <p role="status">
          <UiText text="正在读取设置…" />
        </p>
      )}
      {saved && <RegistrationInvitations />}
    </SettingsLayout>
  );
}
