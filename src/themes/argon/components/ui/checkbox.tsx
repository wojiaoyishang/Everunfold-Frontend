import type { ComponentPropsWithRef } from "react";
import { Icon } from "../icon";

export function Checkbox({
  className = "",
  ...props
}: Omit<ComponentPropsWithRef<"input">, "type">) {
  return (
    <span className={`ui-checkbox ${className}`}>
      <input {...props} type="checkbox" />
      <span className="ui-checkbox-mark" aria-hidden="true">
        <Icon name="check" />
      </span>
    </span>
  );
}
