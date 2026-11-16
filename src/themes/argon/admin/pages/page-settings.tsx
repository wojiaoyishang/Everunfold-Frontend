"use client";

import type { ReactNode } from "react";
import type { PageValue } from "@/core/contracts/pages";
import { UiText, useT } from "@/core/i18n/provider";
import { AuthoringField } from "../components/authoring-field";
import { AuthoredCssField } from "../components/authored-css-field";
import type { AdminFormFieldContext } from "@/core/forms/admin-field-types";
import { Icon } from "../../components/icon";
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
  compactIdentity,
  inheritedComponentCss,
  authoring,
  seo,
  extra,
}: {
  value: PageValue;
  change: (patch: Partial<PageValue>) => void;
  disabled: boolean;
  compact: boolean;
  compactIdentity?: ReactNode;
  inheritedComponentCss?: boolean;
  authoring?: Pick<AdminFormFieldContext, "scene" | "source" | "resourceKey">;
  seo?: ReactNode;
  extra?: ReactNode;
}) {
  return (
    <div
      className={`admin-density-controls ${styles.settings}`}
      data-compact={compact || undefined}
    >
      <PageSettingsGroup title="基本信息" compact={compact}>
        {compactIdentity && (
          <div className={styles.identity}>{compactIdentity}</div>
        )}
        <AuthoringField
          binding={authoring && { ...authoring, field: "description" }}
          label="页面说明"
          value={value.description ?? ""}
          onChange={(description) => change({ description })}
          plainEditor
          maxLength={500}
          disabled={disabled}
        />
      </PageSettingsGroup>
      <PageSettingsGroup
        title="访问与评论"
        initiallyOpen={!compact}
        compact={compact}
      >
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
        {!compact && (
          <p className={styles.help}>
            <UiText text="关闭评论只停止新提交，已有评论仍可阅读。" />
          </p>
        )}
      </PageSettingsGroup>
      <PageSettingsGroup
        title="阅读显示"
        initiallyOpen={!compact}
        compact={compact}
      >
        <div className={styles.switches}>
          <SettingSwitch
            label="隐藏页面标题"
            checked={value.hide_title === true}
            onChange={(hide_title) => change({ hide_title })}
          />
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
      {value.edit_mode === "components" && (
        <PageSettingsGroup
          title="页面 CSS"
          initiallyOpen={false}
          compact={compact}
        >
          <AuthoredCssField
            label="全局 CSS"
            value={
              inheritedComponentCss
                ? value.component_css_override
                : value.component_css
            }
            disabled={disabled}
            onChange={(css) =>
              change(
                inheritedComponentCss
                  ? { component_css_override: css }
                  : { component_css: css },
              )
            }
          />
          {inheritedComponentCss && (
            <p className={styles.help}>
              <UiText text="此处的 CSS 在模板样式之后应用，只影响当前页面。" />
            </p>
          )}
        </PageSettingsGroup>
      )}
      {seo && <div className={styles.seo}>{seo}</div>}
      {extra}
    </div>
  );
}
