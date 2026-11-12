"use client";

import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { useAccountAction, accountFailure } from "@/core/accounts/use-action";
import {
  readAccessSettings,
  saveAccessSettings,
  type AccessSettingsState,
} from "@/core/contracts/accounts";
import { UiText } from "@/core/i18n/provider";
import { Button, Form } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { RouteLink } from "../../components/ui/route-link";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "../settings/section-navigation";
import { SettingsSection, SettingsToggle } from "../settings/shared";
import { RegistrationInvitations } from "./registration-invitations";

export function AccessSettingsPage() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const save = useAccountAction();
  const [draft, setDraft] = useState<AccessSettingsState | null>(null);
  const [saved, setSaved] = useState<AccessSettingsState | null>(null);
  const [error, setError] = useState("");
  const [reload, setReload] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    readAccessSettings(baseUrl, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        setSaved(data);
        setDraft(data);
        setError("");
      })
      .catch((failure) => {
        if (!controller.signal.aborted) setError(accountFailure(failure));
      });
    return () => controller.abort();
  }, [baseUrl, reload]);
  const dirty =
    !!draft &&
    !!saved &&
    (draft.login_captcha !== saved.login_captcha ||
      draft.registration_mode !== saved.registration_mode ||
      draft.registration_captcha !== saved.registration_captcha ||
      draft.email_verification_captcha !== saved.email_verification_captcha ||
      draft.mail_profile_id !== saved.mail_profile_id);
  return (
    <SettingsLayout>
      <AdminPageHeading title="访问与安全" />
      <UnsavedAccountChanges dirty={dirty} busy={save.busy} />
      {draft ? (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void save.run(async (signal) => {
              const result = await saveAccessSettings(
                baseUrl,
                {
                  expected_revision: draft.revision,
                  login_captcha: draft.login_captcha,
                  registration_mode: draft.registration_mode,
                  registration_captcha: draft.registration_captcha,
                  email_verification_captcha: draft.email_verification_captcha,
                  mail_profile_id: draft.mail_profile_id,
                },
                csrfToken,
                { signal },
              );
              if (!signal.aborted) {
                setSaved(result.data);
                setDraft(result.data);
              }
            });
          }}
        >
          <fieldset className="account-fieldset" disabled={save.busy}>
            <SettingsSection
              id="access-login"
              title="登录"
              description="配置登录时的人机验证。"
            >
              <SettingsToggle
                label="登录需要人机验证"
                value={draft.login_captcha}
                onChange={(login_captcha) =>
                  setDraft({ ...draft, login_captcha })
                }
              />
            </SettingsSection>
            <SettingsSection
              id="access-registration"
              title="注册"
              description="新账号在邮箱验证通过后创建。"
            >
              <div className="admin-settings-field">
                <UiText text="注册方式" />
                <Select
                  name="registration-mode"
                  label="注册方式"
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
              <SettingsToggle
                label="注册需要人机验证"
                value={draft.registration_captcha}
                onChange={(registration_captcha) =>
                  setDraft({ ...draft, registration_captcha })
                }
              />
            </SettingsSection>
            <SettingsSection
              id="access-email"
              title="邮箱验证"
              description="设置发送验证码时的人机验证和发信配置。"
            >
              <SettingsToggle
                label="邮箱发码需要人机验证"
                value={draft.email_verification_captcha}
                onChange={(email_verification_captcha) =>
                  setDraft({ ...draft, email_verification_captcha })
                }
              />
              <div className="admin-settings-field">
                <UiText text="认证邮件发信配置" />
                <Select
                  name="access-sender"
                  label="认证邮件发信配置"
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
              {save.message && (
                <span role="status">
                  <UiText text={save.message} />
                </span>
              )}
            </div>
          </fieldset>
        </Form>
      ) : error ? (
        <div role="alert">
          <UiText text={error} />
          <Button
            className="admin-button"
            onClick={() => setReload((value) => value + 1)}
          >
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
