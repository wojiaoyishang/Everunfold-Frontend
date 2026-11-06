"use client";
import { useId } from "react";
import type { ProfileFields } from "@/core/contracts/accounts";
import { UiText, useLanguageCatalog } from "@/core/i18n/provider";
import { TextArea, TextField } from "../components/ui/primitives";
import { PasswordField } from "../components/ui/password-field";
import { Select } from "../components/ui/select";

export function AccountField({
  label,
  value,
  onChange,
  secret = false,
  multiline = false,
  required = false,
  hint,
  minLength,
  maxLength = 2048,
  autoComplete,
  type = "text",
  disabled = false,
  min,
  max,
  step,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
  multiline?: boolean;
  required?: boolean;
  hint?: string;
  minLength?: number;
  maxLength?: number;
  autoComplete?: string;
  type?: "text" | "email" | "url" | "search" | "number";
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const props = {
    id,
    value,
    disabled,
    required,
    minLength,
    maxLength,
    autoComplete,
    min,
    max,
    step,
    "aria-describedby": hint ? id + "-hint" : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
  };
  return (
    <div className="account-field">
      <label htmlFor={id}>
        <UiText text={label} />
      </label>
      {secret ? (
        <PasswordField {...props} />
      ) : multiline ? (
        <TextArea {...props} rows={4} />
      ) : (
        <TextField {...props} type={type} />
      )}
      {hint && (
        <small id={id + "-hint"}>
          <UiText text={hint} />
        </small>
      )}
    </div>
  );
}

export function ProfileFieldsEditor({
  value,
  onChange,
}: {
  value: ProfileFields;
  onChange: (value: ProfileFields) => void;
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
        value={value.email ?? ""}
        onChange={(next) => change("email", next)}
        type="email"
        autoComplete="email"
        hint="邮箱尚未验证，不用于登录或找回密码。"
        maxLength={254}
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
