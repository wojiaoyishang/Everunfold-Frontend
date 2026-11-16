"use client";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { UiText } from "@/core/i18n/provider";
import styles from "./editor-columns.module.css";

/** One viewport-height inspector for every standalone content editor. */
export function EditorInspector({
  label,
  header,
  embedded = false,
  className = "",
  children,
  ...props
}: Omit<ComponentPropsWithoutRef<"aside">, "title"> & {
  label: string;
  header?: ReactNode;
  embedded?: boolean;
}) {
  if (embedded)
    return (
      <aside {...props} className={className || undefined} aria-label={label}>
        {children}
      </aside>
    );
  return (
    <aside
      {...props}
      className={`${styles.inspector} ${className}`}
      data-editor-inspector
      aria-label={label}
    >
      <div className={styles.heading}>
        {header ?? (
          <h2>
            <UiText text={label} />
          </h2>
        )}
      </div>
      <div className={styles.scroll} data-inspector-scroll>
        {children}
      </div>
    </aside>
  );
}
