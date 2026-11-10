export type LocalizedMenuName = {
  label: string;
  labels?: Record<string, string> | null;
};

/** User-defined labels only; empty localized values fall back to the default name. */
export function localizedMenuLabel(item: LocalizedMenuName, locale: string) {
  const exact = item.labels?.[locale]?.trim();
  if (exact) return exact;
  const base = locale.split("-")[0];
  const language = base === locale ? "" : item.labels?.[base]?.trim();
  return language || item.label;
}
