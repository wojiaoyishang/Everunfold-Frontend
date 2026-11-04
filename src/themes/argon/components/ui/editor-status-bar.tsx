"use client";
import type { ReactNode } from "react";
import styles from "./editor-status-bar.module.css";
export function EditorStatusBar({
  count,
  children,
  actions,
}: {
  count: number;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className={styles.bar}>
      <span className={styles.position}>{children}</span>
      <div className={styles.actions}>
        <small>{count.toLocaleString()} 字符</small>
        {actions}
      </div>
    </div>
  );
}
