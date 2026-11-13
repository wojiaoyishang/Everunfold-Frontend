"use client";

import { useId } from "react";
import { UiText } from "@/core/i18n/provider";
import type { useCacheManagement } from "@/core/settings/use-cache-management";
import { Icon } from "../../components/icon";
import { Button, Form, TextField } from "../../components/ui/primitives";
import { SettingsSection } from "./shared";
import styles from "./cache.module.css";

const fields = [
  {
    key: "dynamic_freshness_seconds",
    label: "动态数据刷新间隔",
    unit: "秒",
    min: 5,
    max: 3600,
    fallback: 30,
    hint: "返回标签页时，超过此间隔再检查动态数据。",
  },
  {
    key: "request_timeout_seconds",
    label: "单次请求超时",
    unit: "秒",
    min: 1,
    max: 30,
    fallback: 8,
    hint: "用于公开动态数据请求。",
  },
  {
    key: "retry_delay_ms",
    label: "失败后重试间隔",
    unit: "毫秒",
    min: 100,
    max: 5000,
    fallback: 1500,
    hint: "公开动态数据请求遇到短暂网络错误时，等待后重试一次。",
  },
  {
    key: "batch_delay_ms",
    label: "浏览量合并窗口",
    unit: "毫秒",
    min: 0,
    max: 250,
    fallback: 24,
    hint: "合并同一时刻出现的文章卡片请求，减少重复连接。",
  },
] as const;

function PolicyField({
  field,
  value,
  onChange,
}: {
  field: (typeof fields)[number];
  value: number;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="admin-settings-field">
      <label htmlFor={id}>
        <UiText text={field.label} />
      </label>
      <div className={styles.policyField}>
        <TextField
          id={id}
          type="number"
          min={field.min}
          max={field.max}
          step={1}
          required
          value={Number.isNaN(value) ? "" : value}
          onChange={(event) => onChange(event.currentTarget.valueAsNumber)}
          aria-describedby={`${id}-hint`}
        />
        <span>
          <UiText text={field.unit} />
        </span>
      </div>
      <small id={`${id}-hint`}>
        <UiText text={field.hint} />{" "}
        <UiText
          text="范围 {min}–{max}。"
          values={{ min: field.min, max: field.max }}
        />
      </small>
    </div>
  );
}

export function CachePolicySection({
  node,
  policy,
  editable,
  busy,
}: {
  node: string;
  policy: ReturnType<typeof useCacheManagement>["policy"];
  editable: boolean;
  busy: boolean;
}) {
  const { value } = policy;
  if (!value) return null;
  const valid = fields.every((field) => {
    const number = value[field.key] ?? field.fallback;
    return (
      Number.isInteger(number) && number >= field.min && number <= field.max
    );
  });
  const canSave =
    editable && !busy && policy.dirty && valid && !policy.conflict;
  const notice = policy.conflict
    ? {
        type: "error",
        text: "节点策略已更新。请撤销本地修改以载入最新版本，再重新编辑。",
      }
    : policy.notice;
  return (
    <SettingsSection
      id="settings-nodes"
      title="节点策略"
      description="保存后由后端投递到所选节点。投递进度可在上方查看。"
      action={<span className={styles.policyNode}>{node}</span>}
    >
      <Form
        className={styles.policyForm}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (canSave) policy.save();
        }}
      >
        <fieldset className="admin-settings-form" disabled={busy || !editable}>
          <div className="admin-settings-two-col">
            {fields.map((field) => (
              <PolicyField
                key={field.key}
                field={field}
                value={value[field.key] ?? field.fallback}
                onChange={(value) => policy.update({ [field.key]: value })}
              />
            ))}
          </div>
        </fieldset>
        {!valid && (
          <p className="admin-settings-message is-error" role="alert">
            <UiText text="请输入有效范围内的整数。" />
          </p>
        )}
        {notice && (
          <p
            className={
              notice.type === "error"
                ? "admin-settings-message is-error"
                : "admin-settings-message"
            }
            role={notice.type === "error" ? "alert" : "status"}
          >
            <UiText text={notice.text} />
          </p>
        )}
        {editable && (
          <div className="admin-settings-inline-actions">
            <Button
              className="admin-button admin-button-primary"
              type="submit"
              disabled={!canSave}
            >
              <Icon name={policy.saving ? "refresh" : "check"} />
              <UiText text={policy.saving ? "正在保存" : "保存节点策略"} />
            </Button>
            <Button
              className="admin-button"
              disabled={busy || !policy.dirty}
              onClick={policy.reset}
            >
              <UiText text="撤销修改" />
            </Button>
          </div>
        )}
      </Form>
    </SettingsSection>
  );
}
