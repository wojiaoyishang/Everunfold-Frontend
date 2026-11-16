"use client";

import { useCallback, useSyncExternalStore } from "react";
import { displayDate } from "@/core/content/query";
import { useLocale, UiText } from "@/core/i18n/provider";
import { useSiteReadingPreferences } from "./route-state";
import styles from "./protected-article.module.css";

export function ReadingOpeningTime({ opensAt }: { opensAt: string }) {
  const deadline = Date.parse(opensAt);
  const { uiLocale } = useLocale();
  const preferences = useSiteReadingPreferences();
  const subscribe = useCallback(
    (notify: () => void) => {
      if (!(deadline > Date.now())) return () => {};
      const tick = () => {
        notify();
        if (Date.now() >= deadline) window.clearInterval(timer);
      };
      const timer = window.setInterval(tick, 1000);
      document.addEventListener("visibilitychange", tick);
      return () => {
        window.clearInterval(timer);
        document.removeEventListener("visibilitychange", tick);
      };
    },
    [deadline],
  );
  const seconds = useSyncExternalStore(
    subscribe,
    () => Math.max(0, Math.ceil((deadline - Date.now()) / 1000)),
    () => null,
  );
  if (!Number.isFinite(deadline)) return null;
  const date = displayDate(opensAt, true, uiLocale, preferences);
  return (
    <div className={styles.opening}>
      {seconds !== null && seconds > 0 && (
        <p className={styles.countdown} role="timer">
          <UiText
            text="距开放 {days} 天 {hours} 时 {minutes} 分 {seconds} 秒"
            values={{
              days: Math.floor(seconds / 86400),
              hours: Math.floor(seconds / 3600) % 24,
              minutes: Math.floor(seconds / 60) % 60,
              seconds: seconds % 60,
            }}
          />
        </p>
      )}
      <p>
        <UiText text="开放时间：" />
        <time dateTime={opensAt}>{date}</time>
      </p>
    </div>
  );
}
