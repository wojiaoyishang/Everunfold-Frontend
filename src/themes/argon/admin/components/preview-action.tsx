"use client";
import type { ComponentProps } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./preview-action.module.css";
export function PreviewAction({
  label,
  description,
  icon,
  ...props
}: {
  label: string;
  description: string;
  icon: ComponentProps<typeof Icon>["name"];
} & Omit<ComponentProps<typeof Button>, "children">) {
  const t = useT();
  return (
    <Button
      {...props}
      className={`admin-button admin-editor-preview-action ${styles.action} ${props.className ?? ""}`}
      title={t(description)}
    >
      <Icon name={icon} />
      <UiText text={label} />
    </Button>
  );
}
