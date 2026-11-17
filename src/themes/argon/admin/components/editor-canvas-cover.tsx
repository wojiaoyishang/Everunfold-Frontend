import type { ReactNode } from "react";
import { UiText } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import styles from "./editor-canvas-cover.module.css";

export function EditorCanvasCover({
  overlay = false,
  children,
}: {
  overlay?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={styles.cover} data-overlay={overlay || undefined}>
      {children}
    </div>
  );
}

export function OpenLiveEditorButton({
  disabled,
  onClick,
}: {
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      className="admin-button admin-button-primary"
      disabled={disabled}
      onClick={onClick}
    >
      <Icon name="sidebar" />
      <UiText text="前往实时预览" />
    </Button>
  );
}
