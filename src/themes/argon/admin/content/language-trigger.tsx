"use client";
import { LanguageLabel } from "../../components/language-label";
import { Icon } from "../../components/icon";
import styles from "./translations.module.css";

export function LanguageTrigger({
  code,
  count,
}: {
  code?: string;
  count: number;
}) {
  return (
    <>
      <Icon name="languages" />
      <span className={styles.triggerLabel}>
        <LanguageLabel code={code} compact />
        {count > 1 && <span className={styles.count}>· {count}</span>}
      </span>
    </>
  );
}
