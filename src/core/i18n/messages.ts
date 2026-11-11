import catalog from "./en.json";
import type { Locale } from "./locale";

export type MessageScope = "public" | "admin" | "backend";
export type CustomTranslations = Partial<
  Record<MessageScope, Record<string, Record<string, string>>>
>;

/** Program strings only; article text and user-defined names never become keys. */
export function translate(
  source: string,
  locale: Locale,
  values?: Record<string, string | number>,
  custom?: CustomTranslations,
  scope: MessageScope = "public",
  customLocale: Locale = locale,
): string {
  const customValue = custom?.[scope]?.[customLocale]?.[source];
  if (customValue !== undefined) {
    if (!values) return customValue;
    return customValue.replace(
      /(?<!\{)\{([a-zA-Z_]\w*)\}(?!\})/g,
      (match, key) =>
        Object.hasOwn(values, key) ? String(values[key]) : match,
    );
  }
  if (values) {
    const pattern = translate(
      source,
      locale,
      undefined,
      custom,
      scope,
      customLocale,
    );
    return pattern.replace(/(?<!\{)\{([a-zA-Z_]\w*)\}(?!\})/g, (match, key) =>
      Object.hasOwn(values, key) ? String(values[key]) : match,
    );
  }
  if (locale === "zh-CN") return source;
  if (Object.hasOwn(catalog, source))
    return (catalog as Record<string, string>)[source];

  const numbered = /^(标题|区块|版本)\s*(\d+)$/.exec(source);
  if (numbered)
    return `${(catalog as Record<string, string>)[numbered[1]] ?? numbered[1]} ${numbered[2]}`;
  return source;
}
