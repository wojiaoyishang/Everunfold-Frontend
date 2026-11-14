"use client";
import { UiText } from "@/core/i18n/provider";

import { useId, type ReactNode } from "react";
import { useSettingsEditor } from "@/core/settings/editor";
import type { DeliveryState } from "@/core/contracts/settings";
import {
  Button,
  Form,
  TextArea,
  TextField,
} from "../../components/ui/primitives";
import { Switch } from "../../components/ui/switch";
import { Icon } from "../../components/icon";
import { AdminPageHeading } from "../components/page-heading";
import { SettingsLayout } from "./section-navigation";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";

export function SettingsSection({
  id,
  title,
  description,
  group,
  action,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  group?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="admin-settings-section"
      data-settings-section={title}
      data-settings-group={group}
      tabIndex={-1}
    >
      <div className="admin-settings-section-heading">
        <div>
          <h2>
            <UiText text={title} />
          </h2>
          {description && (
            <p>
              <UiText text={description} />
            </p>
          )}
        </div>
        {action && (
          <div className="admin-settings-section-action">{action}</div>
        )}
      </div>
      <div className="admin-settings-fields">{children}</div>
    </section>
  );
}
export function SettingsText({
  label,
  hint,
  value,
  onChange,
  maxLength = 2048,
  multiline = false,
  placeholder,
  required = false,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const props = {
    id,
    value,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
    ) => onChange(event.target.value),
    maxLength,
    placeholder,
    required,
    "aria-describedby": hint ? `${id}-hint` : undefined,
  };
  return (
    <div className="admin-settings-field">
      <label htmlFor={id}>
        <UiText text={label} />
      </label>
      {multiline ? <TextArea {...props} rows={3} /> : <TextField {...props} />}{" "}
      {hint && (
        <small id={`${id}-hint`}>
          <UiText text={hint} />
        </small>
      )}
    </div>
  );
}
export function SettingsToggle({
  label,
  hint,
  value,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div className="admin-settings-toggle">
      <div>
        <label id={id}>
          <UiText text={label} />
        </label>
        {hint && (
          <small>
            <UiText text={hint} />
          </small>
        )}
      </div>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
        aria-labelledby={id}
      />
    </div>
  );
}
const statusLabels = {
  applied: "已应用",
  pending: "等待同步",
  failed: "同步待重试",
  not_configured: "未启用接收",
};
export function DeliveryBadge({ value }: { value: DeliveryState }) {
  return (
    <span
      className={`admin-badge ${value.status === "applied" ? "admin-badge-success" : ""}`}
    >
      <Icon
        name={
          value.status === "applied"
            ? "check"
            : value.status === "failed"
              ? "cloud-off"
              : "cloud"
        }
      />
      <UiText text={statusLabels[value.status]} />
    </span>
  );
}
export function SettingsSaveBar({
  dirty,
  busy,
  checking = false,
  status,
  delivery,
  form,
  onReset,
}: {
  dirty: boolean;
  busy: boolean;
  checking?: boolean;
  status: ReactNode;
  delivery?: ReactNode;
  form?: string;
  onReset: () => void;
}) {
  return (
    <div className="admin-settings-savebar">
      <div>
        <span>{dirty ? <UiText text="有尚未保存的修改" /> : status}</span>
        {delivery && <div className="admin-settings-delivery">{delivery}</div>}
      </div>
      <div className="admin-settings-actions">
        <Button
          className="admin-button"
          disabled={busy || !dirty}
          onClick={onReset}
        >
          <UiText text="撤销修改" />
        </Button>
        <Button
          className="admin-button admin-button-primary"
          type="submit"
          form={form}
          disabled={busy || !dirty}
        >
          <Icon name={busy ? "refresh" : "check"} />
          <UiText
            text={
              checking ? "正在检查使用情况…" : busy ? "正在保存" : "保存更改"
            }
          />
        </Button>
      </div>
    </div>
  );
}

export function SettingsFrame({
  title,
  description,
  fullWidth,
  children,
}: {
  title: string;
  description?: string;
  fullWidth?: boolean;
  children: ReactNode;
}) {
  const editor = useSettingsEditor();
  const editable = can(useAdminAccount(), "settings:write");
  return (
    <SettingsLayout fullWidth={fullWidth}>
      <AdminPageHeading title={title} description={description} />
      {editor.loading ? (
        <div className="admin-settings-loading" role="status">
          <UiText text="正在读取设置…" />
        </div>
      ) : !editor.draft ? (
        <div className="admin-settings-message" role="alert">
          <UiText text={editor.error} />
          <Button className="admin-button" onClick={() => void editor.reload()}>
            <UiText text="重新读取" />
          </Button>
        </div>
      ) : (
        <Form
          onSubmit={(event) => {
            event.preventDefault();
            void editor.save();
          }}
          noValidate
        >
          <fieldset
            className="admin-settings-form"
            disabled={editor.busy || !editable}
          >
            {children}
          </fieldset>
          {editor.error && (
            <div role="alert" className="admin-settings-message is-error">
              <UiText text={editor.error} />
              <Button
                className="admin-button"
                onClick={() => void editor.reload()}
              >
                <UiText text="放弃本地修改并载入服务器版本" />
              </Button>
            </div>
          )}
          {editor.message && (
            <p role="status" className="admin-settings-message">
              {editor.message}
            </p>
          )}
          <SettingsSaveBar
            dirty={editor.dirty}
            busy={editor.busy}
            checking={editor.checkingPlugins}
            status={`已读取版本 ${editor.saved?.revision ?? ""}`}
            delivery={editor.saved?.delivery
              .filter((node) => node.enabled)
              .map((node) => (
                <span key={node.node_id} title={node.node_id}>
                  <DeliveryBadge value={node} />
                </span>
              ))}
            onReset={editor.reset}
          />
        </Form>
      )}
    </SettingsLayout>
  );
}
