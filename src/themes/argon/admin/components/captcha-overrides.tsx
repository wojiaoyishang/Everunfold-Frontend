"use client";
import { useId } from "react";
import type { EditorSettings } from "@/core/contracts/content-admin";
import { UiText } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import styles from "./captcha-overrides.module.css";

type Policy = Pick<EditorSettings, "captcha_read" | "captcha_comment">;
const options = [
  { value: "inherit", label: "跟随全局" },
  { value: "required", label: "必须验证" },
  { value: "off", label: "无需验证" },
] as const;
export function CaptchaOverrides({
  value,
  onChange,
  disabled = false,
  showHint = true,
}: {
  value: Policy;
  onChange: (value: Partial<Policy>) => void;
  disabled?: boolean;
  showHint?: boolean;
}) {
  const id = useId();
  return (
    <div className={styles.fields}>
      {(
        [
          { key: "captcha_read", label: "阅读验证码" },
          { key: "captcha_comment", label: "评论验证码" },
        ] as const
      ).map((field) => (
        <div key={field.key} className={styles.field}>
          <label htmlFor={`${id}-${field.key}`}>
            <UiText text={field.label} />
          </label>
          <Select
            id={`${id}-${field.key}`}
            name={`${id}-${field.key}`}
            label={field.label}
            value={value[field.key] ?? "inherit"}
            options={options}
            programOptions
            disabled={disabled}
            onValueChange={(next) => {
              if (next === "inherit" || next === "required" || next === "off")
                onChange({ [field.key]: next });
            }}
          />
        </div>
      ))}
      {showHint && (
        <small>
          <UiText text="保存草稿保留设置，发布或应用页面后生效。密码和评论开关仍然有效。" />
        </small>
      )}
    </div>
  );
}
