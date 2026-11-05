import type { ReactNode } from "react";
import { Icon, type IconName } from "../icon";

/** Shared label and leading icon; the wrapped control owns value and validation. */
export function FormField({
  id,
  label,
  icon,
  invalid = false,
  children,
}: {
  id: string;
  label: string;
  icon?: IconName;
  invalid?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="ui-form-field" data-invalid={invalid || undefined}>
      <label htmlFor={id}>
        <UiText text={label} />
      </label>
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
import { UiText } from "@/core/i18n/provider";
