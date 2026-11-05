"use client";
import { UiText } from "@/core/i18n/provider";

import { useId, type ReactNode } from "react";
import { useSettingsEditor } from "@/core/settings/editor";
import type { DeliveryState } from "@/generated/settings-contract";
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

export function SettingsSection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="admin-settings-section"
      data-settings-section={title}
      tabIndex={-1}
    >
      <div className="admin-settings-section-heading">
        <h2>
          <UiText text={title} />
        </h2>
        <p>
          <UiText text={description} />
        </p>
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
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  maxLength?: number;
  multiline?: boolean;
  placeholder?: string;
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
}: {
  label: string;
  hint: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="admin-settings-toggle">
      <div>
        <label id={id}>
          <UiText text={label} />
        </label>
        <small>
          <UiText text={hint} />
        </small>
      </div>
      <Switch checked={value} onCheckedChange={onChange} aria-labelledby={id} />
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
export function SettingsFrame({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  const editor = useSettingsEditor();
  return (
    <SettingsLayout>
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
          <fieldset className="admin-settings-form" disabled={editor.busy}>
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
          <div className="admin-settings-savebar">
            <div>
              <span>
                {editor.dirty ? (
                  <UiText text="有尚未保存的修改" />
                ) : (
                  `已读取版本 ${editor.saved?.revision ?? ""}`
                )}
              </span>
              <div className="admin-settings-delivery">
                {editor.saved?.delivery
                  .filter((node) => node.enabled)
                  .map((node) => (
                    <span key={node.node_id} title={node.node_id}>
                      <DeliveryBadge value={node} />
                    </span>
                  ))}
              </div>
            </div>
            <div className="admin-settings-actions">
              <Button
                className="admin-button"
                disabled={editor.busy || !editor.dirty}
                onClick={editor.reset}
              >
                <UiText text="撤销修改" />
              </Button>
              <Button
                className="admin-button admin-button-primary"
                type="submit"
                disabled={editor.busy || !editor.dirty}
              >
                <Icon name={editor.busy ? "refresh" : "check"} />
                {editor.busy ? (
                  <UiText text="正在保存" />
                ) : (
                  <UiText text="保存更改" />
                )}
              </Button>
            </div>
          </div>
        </Form>
      )}
    </SettingsLayout>
  );
}
