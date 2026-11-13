import {
  initialCatalog,
  activeLanguage,
  type LanguageCatalog,
} from "./catalog";

/** Content language codes are extensible; installed program dictionaries are separate. */
export type Locale = string;
export const installedMessageLocales = ["zh-CN", "en"] as const;
export type MessageLocale = (typeof installedMessageLocales)[number];
export const messageNames: Record<MessageLocale, string> = {
  "zh-CN": "简体中文",
  en: "English",
};
export function nativeMessageLocale(code: string): MessageLocale | undefined {
  return installedMessageLocales.find((item) => item === code);
}
export function localeOf(value: string | null | undefined): Locale {
  if (
    !value ||
    !/^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/.test(value) ||
    value.length > 32
  )
    return "zh-CN";
  const parts = value.split("-");
  return [
    parts[0].toLowerCase(),
    ...parts
      .slice(1)
      .map((part) =>
        part.length === 4 && /^[A-Za-z]+$/.test(part)
          ? part[0].toUpperCase() + part.slice(1).toLowerCase()
          : part.length === 2 && /^[A-Za-z]+$/.test(part)
            ? part.toUpperCase()
            : part.toLowerCase(),
      ),
  ].join("-");
}
export function messageLocale(value: string | null | undefined): MessageLocale {
  return value?.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}
export function browserLocale(): MessageLocale {
  return typeof document === "undefined"
    ? "zh-CN"
    : messageLocale(
        document.documentElement.dataset.uiLocale ||
          document.documentElement.lang,
      );
}

export function browserContentLocale(): Locale {
  return typeof document === "undefined"
    ? "zh-CN"
    : localeOf(document.documentElement.lang);
}
export function localePath(
  path: string,
  catalog: LanguageCatalog = initialCatalog,
): Locale {
  return (
    catalog.languages.find(
      (item) =>
        item.prefix &&
        (path === item.prefix || path.startsWith(item.prefix + "/")),
    )?.code ?? catalog.default_code
  );
}
export function unprefixedPath(
  path: string,
  catalog: LanguageCatalog = initialCatalog,
): string {
  const item = catalog.languages.find(
    (item) =>
      item.prefix &&
      (path === item.prefix || path.startsWith(item.prefix + "/")),
  );
  return item ? path.slice(item.prefix.length) || "/" : path;
}
export function localizeHref(
  href: string,
  locale: Locale,
  catalog: LanguageCatalog = initialCatalog,
): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "http://locale.invalid"),
    path = unprefixedPath(url.pathname, catalog);
  if (
    !/^\/(?:$|(?:article|ss|archives|search|categories|tags)$|(?:gzrj|about)\/?$|category\/|tag\/)/.test(
      path,
    )
  )
    return href;
  const prefix = activeLanguage(catalog, locale).prefix;
  return (
    (prefix ? prefix + (path === "/" ? "/" : path) : path) +
    url.search +
    url.hash
  );
}
