"use client";

import { useId, type ReactNode } from "react";
import dynamic from "next/dynamic";
import { AdminFormFieldExtensions } from "@/core/forms/admin-field-extensions";
import type { AdminFormFieldContext } from "@/core/forms/admin-field-types";
import { UiText, useT } from "@/core/i18n/provider";
import { TextArea, TextField } from "../../components/ui/primitives";
import { ExtensionPlaceholder } from "../../components/extension-placeholder";

const TextEditor = dynamic(() => import("./source-editor"), {
  ssr: false,
  loading: () => <ExtensionPlaceholder name="text-editor" loading />,
});

type Binding = Pick<
  AdminFormFieldContext,
  "scene" | "field" | "source" | "resourceKey"
>;

export function AuthoringField({
  binding,
  label,
  value,
  onChange,
  maxLength,
  disabled,
  placeholder,
  hint,
  labelAside,
  labelControl,
  rows,
  plainEditor = false,
  className = "admin-field",
}: {
  binding?: Binding;
  label: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  disabled?: boolean;
  placeholder?: string;
  hint?: string;
  labelAside?: ReactNode;
  labelControl?: ReactNode;
  rows?: number;
  plainEditor?: boolean;
  className?: string;
}) {
  const id = useId();
  const t = useT();
  const render = (
    view: { placeholder?: string; description?: string },
    actions?: ReactNode,
  ) => {
    const props = {
      id,
      value,
      disabled,
      placeholder: view.placeholder,
      maxLength,
      "aria-describedby": view.description ? id + "-hint" : undefined,
      onChange: (
        event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
      ) => onChange(event.target.value),
    };
    return (
      <div className={className}>
        <div className="admin-authoring-field-heading">
          <div className="admin-authoring-field-label">
            <label htmlFor={id}>
              <UiText text={label} />
              {labelAside}
            </label>
            {labelControl}
          </div>
          {actions}
        </div>
        {plainEditor ? (
          <TextEditor
            kind="text"
            inputId={id}
            label={t(label)}
            value={value}
            onChange={onChange}
            limit={maxLength}
            disabled={disabled}
            descriptionId={props["aria-describedby"]}
            placeholder={view.placeholder}
          />
        ) : rows ? (
          <TextArea {...props} rows={rows} />
        ) : (
          <TextField {...props} />
        )}
        {view.description && (
          <small id={id + "-hint"}>
            <UiText text={view.description} />
          </small>
        )}
      </div>
    );
  };
  const view = { placeholder, description: hint };
  return binding ? (
    <AdminFormFieldExtensions
      field={{ ...binding, label, value, maxLength, disabled, apply: onChange }}
      view={view}
    >
      {render}
    </AdminFormFieldExtensions>
  ) : (
    render(view)
  );
}
