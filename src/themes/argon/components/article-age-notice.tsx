"use client";

import { useSyncExternalStore } from "react";
import type { ContentMetadata } from "@/core/content/types";
import type { ArticleDisplayPreferences } from "@/core/contracts/settings";
import { UiText } from "@/core/i18n/provider";

const readClock = () => Math.floor(Date.now() / 60_000) * 60_000;

function subscribe(update: () => void) {
  const timer = setInterval(update, 60_000);
  return () => clearInterval(timer);
}

export function ArticleAgeNotice({
  content,
  display,
}: {
  content: ContentMetadata;
  display?: ArticleDisplayPreferences;
}) {
  const now = useSyncExternalStore(subscribe, readClock, () => 0);
  const threshold = display?.stale_days ?? 0;
  const source =
    display?.stale_basis === "published"
      ? content.published_at
      : content.updated_at;
  if (!threshold || !now || now - Date.parse(source) < threshold * 86_400_000)
    return null;
  return (
    <p className="article-age-notice">
      <UiText text="这篇文章距设定的日期已较久，部分内容可能需要更新。" />
    </p>
  );
}
