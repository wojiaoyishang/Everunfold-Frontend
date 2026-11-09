"use client";
import type { InstalledTheme } from "@/core/contracts/settings";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { ThemeInformation, ThemePreview } from "./theme-information";
import styles from "./theme-card.module.css";
export function ThemeCard({
  theme,
  active,
  onOpen,
}: {
  theme: InstalledTheme;
  active: boolean;
  onOpen: () => void;
}) {
  const t = useT();
  return (
    <article
      className={styles.card}
      data-selected={active}
      data-theme-id={theme.id}
    >
      <Button
        className={styles.choose}
        aria-haspopup="dialog"
        aria-label={`${t("查看主题详情")}：${theme.title}`}
        onClick={onOpen}
      >
        <span className={styles.preview}>
          <ThemePreview key={theme.preview} source={theme.preview} />
        </span>
        <span className={styles.heading}>
          <strong>{theme.title}</strong>
          <span className={styles.choice}>
            <Icon name={active ? "check" : "eye"} />
            <UiText text={active ? "使用中" : "查看详情"} />
          </span>
        </span>
        {theme.description && (
          <span className={styles.description}>
            <UiText text={theme.description} />
          </span>
        )}
      </Button>
      <ThemeInformation theme={theme} />
    </article>
  );
}
