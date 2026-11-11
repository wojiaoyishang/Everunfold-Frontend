import catalog from "./en.json";
import type { Locale } from "./locale";

export type MessageScope = "public" | "admin" | "backend";
export type CustomTranslations = Partial<
  Record<MessageScope, Record<string, Record<string, string>>>
>;

const placeholder = /(?<!\{)\{([^{}]+)\}(?!\})/g;

function interpolate(
  template: string,
  values?: Record<string, string | number>,
) {
  if (!values) return template;
  return template.replace(placeholder, (match, name: string) =>
    Object.hasOwn(values, name) ? String(values[name]) : match,
  );
}

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
  if (typeof customValue === "string" && customValue.trim()) {
    return interpolate(customValue, values);
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
    return interpolate(pattern, values);
  }
  if (locale === "zh-CN") return source;
  if (Object.hasOwn(catalog, source))
    return (catalog as Record<string, string>)[source];

  const numbered = /^(标题|区块|版本)\s*(\d+)$/.exec(source);
  if (numbered)
    return `${(catalog as Record<string, string>)[numbered[1]] ?? numbered[1]} ${numbered[2]}`;
  return source;
}
