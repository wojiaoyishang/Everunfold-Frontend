"use client";

import { displayDate } from "@/core/content/query";
import { useLocale } from "@/core/i18n/provider";
import { useSiteReadingPreferences } from "./route-state";

export function PublicDate({ value }: { value: string }) {
  const preferences = useSiteReadingPreferences();
  const { uiLocale } = useLocale();
  return displayDate(value, false, uiLocale, preferences);
}
