"use client";
import type { ReactNode } from "react";
import { useFileDrop } from "@/core/media/use-file-drop";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../icon";
import styles from "./file-drop-zone.module.css";

export function FileDropZone({
  onFiles,
  disabled = false,
  children,
  className = "",
  label = "拖放文件到这里",
  capture = false,
}: {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
  label?: string;
  capture?: boolean;
}) {
  const drop = useFileDrop(onFiles, disabled);
  const t = useT();
  return (
    <div
      {...drop.handlers}
      onDropCapture={capture ? drop.handlers.onDrop : undefined}
      className={`${styles.zone} ${className}`}
      data-file-drop-zone
      data-dragging={drop.active}
      aria-label={t(label)}
    >
      {children}
      {drop.active && (
        <div className={styles.overlay} role="status">
          <span className={styles.cue}>
            <Icon name="upload" />
            <UiText text="松开以上传文件" />
          </span>
        </div>
      )}
      {drop.message && (
        <p className={styles.message} role="status">
          <UiText text={drop.message} />
        </p>
      )}
    </div>
  );
}
