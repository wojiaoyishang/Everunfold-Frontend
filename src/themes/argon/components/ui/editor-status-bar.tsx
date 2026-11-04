"use client";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import styles from "./editor-status-bar.module.css";
export function EditorStatusBar({
  count,
  children,
  actions,
  target,
  hidden = false,
}: {
  count: number;
  children?: ReactNode;
  actions?: ReactNode;
  target?: HTMLElement | null;
  hidden?: boolean;
}) {
  if (hidden) return null;
  const bar = (
    <div className={styles.bar}>
      <span className={styles.position}>{children}</span>
      <div className={styles.actions}>
        <small>{count.toLocaleString()} 字符</small>
        {actions}
      </div>
    </div>
  );
  return target ? createPortal(bar, target) : bar;
}
