"use client";

import { useId, type ReactNode } from "react";
import { AdminFormFieldExtensions } from "@/core/forms/admin-field-extensions";
import type { AdminFormFieldContext } from "@/core/forms/admin-field-types";
import { UiText } from "@/core/i18n/provider";
import { TextArea, TextField } from "../../components/ui/primitives";

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
  rows,
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
  rows?: number;
  className?: string;
}) {
  const id = useId();
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
          <label htmlFor={id}>
            <UiText text={label} />
            {labelAside}
          </label>
          {actions}
        </div>
        {rows ? <TextArea {...props} rows={rows} /> : <TextField {...props} />}
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
