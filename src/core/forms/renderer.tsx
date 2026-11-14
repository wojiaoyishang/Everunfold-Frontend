"use client";
import type { ReactNode } from "react";
import { ExtensionComponent } from "@/core/extensions/components";
import { AdminFormFieldExtensions } from "./admin-field-extensions";
import type {
  AdminFormFieldContext,
  AdminFormFieldSource,
  AdminFormFieldView,
} from "./admin-field-types";
import type { SettingField, SettingsModel } from "./schema";

export type SettingsValues = Record<string, unknown>;
export interface FormFieldProps {
  field: SettingField;
  value: unknown;
  disabled?: boolean;
  authoringActions?: ReactNode;
  authoringView?: AdminFormFieldView;
  onChange: (value: unknown) => void;
  renderFields: (
    fields: readonly SettingField[],
    value: SettingsValues,
    onChange: (value: SettingsValues) => void,
  ) => ReactNode;
}

interface SettingsFormAuthoring {
  scene: string;
  resourceKey?: string;
  source: (
    field: string,
  ) => AdminFormFieldSource | Promise<AdminFormFieldSource>;
}

function Field({
  field,
  value,
  onChange,
  disabled,
  authoring,
}: Omit<
  FormFieldProps,
  "renderFields" | "authoringActions" | "authoringView"
> & { authoring?: SettingsFormAuthoring }) {
  const render = (view?: AdminFormFieldView, actions?: ReactNode) => (
    <ExtensionComponent
      name={field.component}
      field={field}
      value={value}
      onChange={onChange}
      disabled={disabled}
      authoringActions={actions}
      authoringView={view}
      renderFields={(
        fields: readonly SettingField[],
        value: SettingsValues,
        update: (value: SettingsValues) => void,
      ) => (
        <SettingsForm
          model={{ fields }}
          value={value}
          onChange={update}
          disabled={disabled}
        />
      )}
    />
  );
  if (
    !authoring ||
    field.authoringAction !== true ||
    !["form.text", "form.textarea"].includes(field.component)
  )
    return render();
  const binding: AdminFormFieldContext = {
    scene: authoring.scene,
    resourceKey: authoring.resourceKey,
    field: field.key,
    label: field.label,
    value: typeof value === "string" ? value : "",
    maxLength:
      typeof field.props?.maxLength === "number"
        ? field.props.maxLength
        : undefined,
    disabled,
    source: () => authoring.source(field.key),
    apply: onChange,
  };
  return (
    <AdminFormFieldExtensions
      field={binding}
      view={{
        placeholder:
          typeof field.props?.placeholder === "string"
            ? field.props.placeholder
            : undefined,
        description:
          typeof field.props?.description === "string"
            ? field.props.description
            : undefined,
      }}
    >
      {render}
    </AdminFormFieldExtensions>
  );
}

export function SettingsForm({
  model,
  value,
  onChange,
  disabled,
  authoring,
}: {
  model: SettingsModel;
  value: SettingsValues;
  onChange: (value: SettingsValues) => void;
  disabled?: boolean;
  authoring?: SettingsFormAuthoring;
}) {
  return (
    <div className="settings-schema-form">
      {model.fields.map((field) => (
        <Field
          key={field.key}
          field={field}
          value={
            Object.hasOwn(value, field.key) ? value[field.key] : field.default
          }
          onChange={(next) => onChange({ ...value, [field.key]: next })}
          disabled={disabled}
          authoring={authoring}
        />
      ))}
    </div>
  );
}
