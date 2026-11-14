"use client";

import type { ReactNode } from "react";
import { useT } from "@/core/i18n/provider";
import { TextField } from "../../components/ui/primitives";
import styles from "./editor-identity.module.css";

export function EditorIdentity({
  label,
  placeholder,
  value,
  onChange,
  disabled,
  maxLength = 200,
  permalink,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
  permalink: ReactNode;
}) {
  const t = useT();
  return (
    <div className={styles.identity}>
      <TextField
        className={styles.title}
        aria-label={t(label)}
        placeholder={placeholder ? t(placeholder) : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        maxLength={maxLength}
      />
      {permalink}
    </div>
  );
}
