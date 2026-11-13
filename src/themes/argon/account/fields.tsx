"use client";
import { useId } from "react";
import type { ReactNode } from "react";
import type { ProfileFields } from "@/core/contracts/accounts";
import { UiText, useLanguageCatalog } from "@/core/i18n/provider";
import { TextArea, TextField } from "../components/ui/primitives";
import { PasswordField } from "../components/ui/password-field";
import { Select } from "../components/ui/select";

export function AccountField({
  label,
  labelAside,
  value,
  onChange,
  secret = false,
  multiline = false,
  required = false,
  hint,
  error,
  minLength,
  maxLength = 2048,
  autoComplete,
  type = "text",
  disabled = false,
  readOnly = false,
  min,
  max,
  step,
  action,
}: {
  label: string;
  labelAside?: ReactNode;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
  error?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  type?: "text" | "email" | "url" | "search" | "number";
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  readOnly?: boolean;
  action?: ReactNode;
}) {
  const id = useId();
  const props = {
    id,
    value,
    disabled,
    readOnly,
    required,
    minLength,
    maxLength,
    autoComplete,
    min,
    max,
    step,
    "aria-invalid": Boolean(error) || undefined,
    "aria-describedby": error || hint ? id + "-hint" : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };
  return (
    <div className="account-field">
      <div className="account-field-label">
        <label htmlFor={id}>
          <UiText text={label} />
        </label>
        {labelAside}
      </div>
      {secret ? (
        <PasswordField {...props} />
      ) : multiline ? (
        <TextArea {...props} rows={4} />
      ) : action ? (
        <div className="account-field-control">
          <TextField {...props} type={type} />
          {action}
        </div>
      ) : (
        <TextField {...props} type={type} />
      )}
      {(error || hint) && (
        <small id={id + "-hint"}>
          <UiText text={error || hint || ""} />
        </small>
      )}
    </div>
  );
}

export function ProfileFieldsEditor({
  value,
  onChange,
  emailAction,
  emailStatus,
  emailReadOnly = false,
}: {
  value: ProfileFields;
  onChange: (value: ProfileFields) => void;
  emailAction?: ReactNode;
  emailStatus?: ReactNode;
  emailReadOnly?: boolean;
}) {
  const catalog = useLanguageCatalog();
  const change = (field: keyof ProfileFields, next: string) =>
    onChange({ ...value, [field]: next });
  const languages = catalog.languages.map((language) => ({
    value: language.code,
    label: language.name,
  }));
  if (!languages.some((item) => item.value === value.preferred_locale))
    languages.push({
      value: value.preferred_locale ?? "zh-CN",
      label: value.preferred_locale ?? "zh-CN",
    });
  return (
    <div className="account-form-grid">
      <AccountField
        label="显示名称"
        value={value.display_name}
        onChange={(next) => change("display_name", next)}
        required
        maxLength={100}
        autoComplete="nickname"
      />
      <AccountField
        label="邮箱"
        labelAside={emailStatus}
        value={value.email ?? ""}
        onChange={(next) => change("email", next)}
        type="email"
        autoComplete="email"
        hint="邮箱用于接收验证码和通知；修改邮箱后需要重新验证。"
        maxLength={254}
        action={emailAction}
        readOnly={emailReadOnly}
      />
      <AccountField
        label="个人网站"
        value={value.website ?? ""}
        onChange={(next) => change("website", next)}
        autoComplete="url"
      />
      <div className="account-field">
        <span>
          <UiText text="偏好语言" />
        </span>
        <Select
          name="profile-locale"
          label="偏好语言"
          value={value.preferred_locale}
          options={languages}
          onValueChange={(next) => change("preferred_locale", next)}
        />
      </div>
      <div className="account-wide">
        <AccountField
          label="个人简介"
          value={value.bio ?? ""}
          onChange={(next) => change("bio", next)}
          multiline
          maxLength={2000}
        />
      </div>
    </div>
  );
}

export function profileFields(value: ProfileFields): ProfileFields {
  return {
    display_name: value.display_name,
    email: value.email ?? "",
    avatar_url: value.avatar_url ?? "",
    avatar_id: value.avatar_id ?? null,
    bio: value.bio ?? "",
    website: value.website ?? "",
    preferred_locale: value.preferred_locale ?? "zh-CN",
  };
}
