import type { ComponentPropsWithRef } from "react";
import { Button } from "./primitives";

export function Switch({
  checked,
  onCheckedChange,
  className = "",
  ...props
}: Omit<
  ComponentPropsWithRef<"button">,
  "role" | "aria-checked" | "onClick" | "children"
> & {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Button
      {...props}
      role="switch"
      aria-checked={checked}
      className={`ui-switch ${className}`}
      onClick={() => onCheckedChange(!checked)}
    >
      <span aria-hidden="true" />
    </Button>
  );
}
