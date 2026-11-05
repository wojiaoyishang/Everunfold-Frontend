"use client";
import { useLanguageCatalog } from "@/core/i18n/provider";
import { defaultFlag, languageName } from "@/core/i18n/catalog";
import styles from "./languages.module.css";
export function LanguageLabel({
  code,
  compact = false,
}: {
  code?: string;
  compact?: boolean;
}) {
  const catalog = useLanguageCatalog(),
    chosen = code ?? catalog.default_code;
  const entry = catalog.languages.find((item) => item.code === chosen);
  return (
    <span className={styles.label}>
      <span className={styles.flag} aria-hidden="true">
        {entry?.flag || defaultFlag(chosen)}
      </span>
      <span>
        {compact ? chosen.toUpperCase() : languageName(catalog, chosen)}
      </span>
    </span>
  );
}
