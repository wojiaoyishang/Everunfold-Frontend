import type { ReactNode } from "react";
import { UiText } from "@/core/i18n/provider";
import { Icon, type IconName } from "../icon";

/** Shared label and leading icon; the wrapped control owns value and validation. */
export function FormField({
  id,
  label,
  icon,
  invalid = false,
  children,
  action,
}: {
  id: string;
  label: string;
  icon?: IconName;
  invalid?: boolean;
  children: ReactNode;
  action?: ReactNode;
}) {
  const fieldLabel = (
    <label htmlFor={id}>
      <UiText text={label} />
    </label>
  );
  return (
    <div className="ui-form-field" data-invalid={invalid || undefined}>
      {action ? (
        <div className="ui-field-heading">
          {fieldLabel}
          {action}
        </div>
      ) : (
        fieldLabel
      )}
      <div className="ui-field-control" data-leading-icon={Boolean(icon)}>
        {icon && (
          <span className="ui-field-icon">
            <Icon name={icon} />
          </span>
        )}
        {children}
      </div>
    </div>
  );
}
