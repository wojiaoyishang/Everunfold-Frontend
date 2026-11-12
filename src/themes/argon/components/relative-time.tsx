"use client";
import { useEffect, useState } from "react";
import { useSiteReadingPreferences } from "./route-state";
import { displayDate } from "@/core/content/query";
import { relativeTime } from "@/core/browser/relative-time";
import { useLocale } from "@/core/i18n/provider";

export function RelativeTime({ value }: { value: string }) {
  const reading = useSiteReadingPreferences();
  const { uiLocale: locale } = useLocale();
  const [label, setLabel] = useState("");
  useEffect(() => {
    const update = () => setLabel(relativeTime(value, Date.now(), locale));
    const frame = requestAnimationFrame(update);
    const timer = setInterval(update, 60_000);
    return () => {
      cancelAnimationFrame(frame);
      clearInterval(timer);
    };
  }, [value, locale]);
  return (
    <time dateTime={value} title={displayDate(value, true, locale, reading)}>
      {label || displayDate(value, true, locale, reading)}
    </time>
  );
}
