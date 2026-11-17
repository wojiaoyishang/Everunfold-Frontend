"use client";
import type { ComponentProps } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./preview-action.module.css";
type ActionProps = {
  label: string;
  description?: string;
  icon: ComponentProps<typeof Icon>["name"];
} & Omit<ComponentProps<typeof Button>, "children">;

export function EditorSecondaryAction({
  label,
  description,
  icon,
  className,
  ...props
}: ActionProps) {
  const t = useT();
  return (
    <Button
      {...props}
      className={`admin-button ${styles.action} ${className ?? ""}`}
      title={description ? t(description) : undefined}
    >
      <Icon name={icon} />
      <UiText text={label} />
    </Button>
  );
}

export function PreviewAction({ className, ...props }: ActionProps) {
  return (
    <EditorSecondaryAction
      {...props}
      className={`admin-editor-preview-action ${className ?? ""}`}
    />
  );
}
