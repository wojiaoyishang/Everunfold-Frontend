"use client";

import { useId, type ReactNode } from "react";
import type { PageValue } from "@/core/contracts/pages";
import { UiText, useLanguageCatalog, useT } from "@/core/i18n/provider";
import { AccountField } from "../../account/fields";
import { Icon } from "../../components/icon";
import { Select } from "../../components/ui/select";
import { Switch } from "../../components/ui/switch";
import { CaptchaOverrides } from "../components/captcha-overrides";
import styles from "./page-settings.module.css";

const readingPreferences = [
  { key: "show_image_viewer", label: "正文图片点击查看" },
  { key: "show_glossary_tooltips", label: "正文内术语悬浮提示" },
  { key: "show_glossary_footnotes", label: "正文末尾术语脚注" },
] as const;

export function PageSettingsGroup({
  title,
  initiallyOpen = true,
  compact = false,
  children,
}: {
  title: string;
  initiallyOpen?: boolean;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className={styles.group}
      data-compact={compact || undefined}
      open={initiallyOpen || undefined}
    >
      <summary>
        <UiText text={title} />
        <Icon name="chevron" />
      </summary>
      <div className={styles.fields}>{children}</div>
    </details>
  );
}

function SettingSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  const t = useT();
  return (
    <div className={styles.switchRow}>
      <span>
        <UiText text={label} />
      </span>
      <Switch
        aria-label={t(label)}
        checked={checked}
        onCheckedChange={onChange}
      />
    </div>
  );
}

export function PageSettings({
  value,
  change,
  disabled,
  compact,
  language,
  compactIdentity,
  seo,
  extra,
}: {
  value: PageValue;
  change: (patch: Partial<PageValue>) => void;
  disabled: boolean;
  compact: boolean;
  language?: { value: string; onChange: (value: string) => void };
  compactIdentity?: ReactNode;
  seo?: ReactNode;
  extra?: ReactNode;
}) {
  const catalog = useLanguageCatalog();
  const languageId = useId();
  return (
    <div
      className={`admin-density-controls ${styles.settings}`}
      data-compact={compact || undefined}
    >
      <PageSettingsGroup title="基本信息">
        {compactIdentity && (
          <div className={styles.identity}>{compactIdentity}</div>
        )}
        {language && (
          <div className={styles.language}>
            <label htmlFor={languageId}>
              <UiText text="内容语言" />
            </label>
            <Select
              id={languageId}
              name="page-language"
              label="内容语言"
              value={language.value}
              onValueChange={language.onChange}
              options={catalog.languages
                .filter((item) => item.enabled)
                .map((item) => ({
                  value: item.code,
                  label: item.name,
                  flag: item.flag,
                }))}
            />
          </div>
        )}
        <AccountField
          label="页面说明"
          value={value.description ?? ""}
          onChange={(description) => change({ description })}
          multiline
          maxLength={500}
        />
      </PageSettingsGroup>
      <PageSettingsGroup title="访问与评论" initiallyOpen={!compact}>
        <div className={styles.switches}>
          <SettingSwitch
            label="启用页面"
            checked={Boolean(value.enabled)}
            onChange={(enabled) => change({ enabled })}
          />
          <SettingSwitch
            label="允许评论"
            checked={value.comments_open ?? true}
            onChange={(comments_open) => change({ comments_open })}
          />
        </div>
        <CaptchaOverrides
          value={value}
          onChange={change}
          disabled={disabled}
          showHint={false}
        />
        <p className={styles.help}>
          <UiText text="关闭评论只停止新提交，已有评论仍可阅读。" />
        </p>
      </PageSettingsGroup>
      <PageSettingsGroup title="阅读显示" initiallyOpen={!compact}>
        <div className={styles.switches}>
          {readingPreferences.map(({ key, label }) => (
            <SettingSwitch
              key={key}
              label={label}
              checked={value[key] !== false}
              onChange={(checked) => change({ [key]: checked })}
            />
          ))}
        </div>
      </PageSettingsGroup>
      {seo && <div className={styles.seo}>{seo}</div>}
      {extra}
    </div>
  );
}
