export function relativeTime(value: string, now: number): string {
  const delta = Math.max(0, now - Date.parse(value));
  if (!Number.isFinite(delta)) return "";
  if (delta < 60_000) return "刚刚";
  if (delta < 3_600_000) return `${Math.floor(delta / 60_000)} 分钟前`;
  if (delta < 86_400_000) return `${Math.floor(delta / 3_600_000)} 小时前`;
  if (delta < 7 * 86_400_000) return `${Math.floor(delta / 86_400_000)} 天前`;
  return "";
}
