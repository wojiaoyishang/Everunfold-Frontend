"use client";
import type { ReactNode } from "react";
import { ExtensionComponent } from "@/core/extensions/components";
import type { SettingField, SettingsModel } from "./schema";

export type SettingsValues = Record<string, unknown>;
export interface FormFieldProps {
  field: SettingField;
  value: unknown;
  disabled?: boolean;
  onChange: (value: unknown) => void;
  renderFields: (
    fields: readonly SettingField[],
    value: SettingsValues,
    onChange: (value: SettingsValues) => void,
  ) => ReactNode;
}

function Field({
  field,
  value,
  onChange,
  disabled,
}: Omit<FormFieldProps, "renderFields">) {
  return (
    <ExtensionComponent
      name={field.component}
      field={field}
      value={value}
      onChange={onChange}
      disabled={disabled}
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
}

export function SettingsForm({
  model,
  value,
  onChange,
  disabled,
}: {
  model: SettingsModel;
  value: SettingsValues;
  onChange: (value: SettingsValues) => void;
  disabled?: boolean;
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
        />
      ))}
    </div>
  );
}
