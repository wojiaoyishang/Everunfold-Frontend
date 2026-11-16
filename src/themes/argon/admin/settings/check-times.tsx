"use client";

import { UiText, useLocale } from "@/core/i18n/provider";

export function CacheCheckTimes({
  checkedAt,
  lastSyncCheckAt,
  nextSyncCheckAt,
}: {
  checkedAt: string;
  lastSyncCheckAt?: string | null;
  nextSyncCheckAt?: string | null;
}) {
  const { uiLocale } = useLocale();
  // 这些时间由客户端状态请求提供，在浏览器时区显示。
  const clock = new Intl.DateTimeFormat(uiLocale, {
    dateStyle: "medium",
    timeStyle: "long",
  });
  const checks = [
    ["检查时间", checkedAt],
    ["上次同步检查", lastSyncCheckAt],
    ["下次同步检查", nextSyncCheckAt],
  ] as const;
  return checks.map(([label, value]) => {
    const instant = Date.parse(value ?? "");
    return (
      <div key={label}>
        <dt>
          <UiText text={label} />
        </dt>
        <dd>
          {Number.isFinite(instant) ? (
            <time dateTime={value ?? undefined}>{clock.format(instant)}</time>
          ) : (
            "—"
          )}
        </dd>
      </div>
    );
  });
}
