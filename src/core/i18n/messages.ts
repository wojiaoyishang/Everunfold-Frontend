import catalog from "./en.json";
import type { Locale } from "./locale";

/** Program strings only; article text and user-defined names never become keys. */
export function translate(
  source: string,
  locale: Locale,
  values?: Record<string, string | number>,
): string {
  if (values) {
    const pattern = translate(source, locale);
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
