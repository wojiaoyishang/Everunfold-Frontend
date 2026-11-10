"use client";
import { useLanguageCatalog } from "@/core/i18n/provider";
import { defaultFlag, languageName } from "@/core/i18n/catalog";
import { LanguageFlag } from "./language-flag";
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
      <LanguageFlag value={entry?.flag || defaultFlag(chosen)} />
      <span>
        {compact ? chosen.toUpperCase() : languageName(catalog, chosen)}
      </span>
    </span>
  );
}
