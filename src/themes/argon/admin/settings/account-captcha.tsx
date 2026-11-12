"use client";

import { useAccessSettings } from "@/core/accounts/use-access-settings";
import { UiText } from "@/core/i18n/provider";
import { UnsavedAccountChanges } from "../../account/unsaved";
import { Button, Form } from "../../components/ui/primitives";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "./section-navigation";
import { SettingsSection, SettingsToggle } from "./shared";

const accountRules = [
  { action: "login", field: "login_captcha", label: "登录需要人机验证" },
  {
    action: "registration",
    field: "registration_captcha",
    label: "注册需要人机验证",
  },
  {
    action: "email_verification",
    field: "email_verification_captcha",
    label: "邮箱发码需要人机验证",
  },
] as const;

type AccountAction = (typeof accountRules)[number]["action"];

export function AccountCaptchaSection({
  rules,
  onChange,
  disabled,
}: {
  rules: Partial<Record<AccountAction, boolean>>;
  onChange: (action: AccountAction, value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <SettingsSection
      id="captcha-account"
      title="账号人机验证"
      description="选择登录、注册或发送邮箱验证码时是否需要先完成人机验证。"
      group="验证码"
    >
      {accountRules.map(({ action, label }) => (
        <SettingsToggle
          key={action}
          label={label}
          value={rules[action] ?? false}
          disabled={disabled}
          onChange={(value) => onChange(action, value)}
        />
      ))}
    </SettingsSection>
  );
}

export function AccountCaptchaPage() {
  const { draft, saved, setDraft, save, busy, message, error, reload } =
    useAccessSettings();
  const dirty =
    !!draft &&
    !!saved &&
    accountRules.some(({ field }) => draft[field] !== saved[field]);
  return (
    <SettingsLayout>
      <AdminPageHeading title="验证码配置" />
      <UnsavedAccountChanges dirty={dirty} busy={busy} />
      {draft ? (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            if (dirty)
              save({
                login_captcha: draft.login_captcha,
                registration_captcha: draft.registration_captcha,
                email_verification_captcha: draft.email_verification_captcha,
              });
          }}
        >
          <fieldset className="admin-settings-form" disabled={busy}>
            <AccountCaptchaSection
              rules={{
                login: draft.login_captcha,
                registration: draft.registration_captcha,
                email_verification: draft.email_verification_captcha,
              }}
              onChange={(action, value) => {
                const rule = accountRules.find(
                  (item) => item.action === action,
                );
                if (rule) setDraft({ ...draft, [rule.field]: value });
              }}
            />
          </fieldset>
          <div className="account-actions">
            <Button
              type="submit"
              className="admin-button admin-button-primary"
              disabled={!dirty || busy}
            >
              <UiText text="保存设置" />
            </Button>
            {message && (
              <span role="status">
                <UiText text={message} />
              </span>
            )}
          </div>
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
    </SettingsLayout>
  );
}
