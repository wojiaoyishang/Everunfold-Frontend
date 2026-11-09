import type { ComponentProps } from "react";
import { Icon, type IconName } from "../../components/icon";
import { Button } from "../../components/ui/primitives";

export type AdminActionTone =
  "neutral" | "accent" | "positive" | "warning" | "danger";

/** Labeled admin actions share semantic colors, focus and disabled states. */
export function AdminActionButton({
  icon,
  tone = "neutral",
  className = "",
  children,
  ...props
}: ComponentProps<typeof Button> & { icon: IconName; tone?: AdminActionTone }) {
  return (
    <Button
      {...props}
      className={`admin-button admin-action-button ${className}`}
      data-tone={tone}
    >
      <Icon name={icon} />
      {children}
    </Button>
  );
}
