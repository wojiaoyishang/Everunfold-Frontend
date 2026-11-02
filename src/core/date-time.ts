/** Local-calendar selection crosses the API boundary as an explicit UTC instant. */
export function calendarDays(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  return Array.from(
    { length: 42 },
    (_, index) => new Date(year, month, 1 - offset + index),
  );
}
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();
export function localInstant(day: Date, hour: number, minute: number): string {
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    hour,
    minute,
  ).toISOString();
}
export function dateValue(value?: string | null): Date | null {
  return value && Number.isFinite(Date.parse(value)) ? new Date(value) : null;
}
export function dateLabel(value: string): string {
  const date = dateValue(value);
  if (!date) return value;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}/${pad(date.getMonth() + 1)}/${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
