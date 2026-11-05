export function relativeTime(
  value: string,
  now: number,
  locale = "zh-CN",
): string {
  const delta = Math.max(0, now - Date.parse(value));
  if (!Number.isFinite(delta)) return "";
  if (locale === "en") {
    if (delta >= 7 * 86_400_000) return "";
    const unit =
      delta < 60_000
        ? "second"
        : delta < 3_600_000
          ? "minute"
          : delta < 86_400_000
            ? "hour"
            : "day";
    const divisor =
      unit === "second"
        ? 1000
        : unit === "minute"
          ? 60_000
          : unit === "hour"
            ? 3_600_000
            : 86_400_000;
    return new Intl.RelativeTimeFormat("en", { numeric: "auto" }).format(
      -Math.floor(delta / divisor),
      unit,
    );
  }
  if (delta < 60_000) return "刚刚";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
  return "";
}
