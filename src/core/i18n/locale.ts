export type Locale = "zh-CN" | "en";
export const locales = ["zh-CN", "en"] as const;
export const localeNames: Record<Locale, string> = {
  "zh-CN": "简体中文",
  en: "English",
};
export function localeOf(value: string | null | undefined): Locale {
  return value?.toLowerCase().startsWith("en") ? "en" : "zh-CN";
}
export function browserLocale(): Locale {
  return typeof document === "undefined"
    ? "zh-CN"
    : localeOf(
        document.documentElement.dataset.uiLocale ||
          document.documentElement.lang,
      );
}
export function localePath(path: string): Locale {
  return path === "/en" || path.startsWith("/en/") ? "en" : "zh-CN";
}
export function unprefixedPath(path: string): string {
  return path === "/en" ? "/" : path.startsWith("/en/") ? path.slice(3) : path;
}
export function localizeHref(href: string, locale: Locale): string {
  if (!href.startsWith("/") || href.startsWith("//")) return href;
  const url = new URL(href, "http://locale.invalid");
  const path = unprefixedPath(url.pathname);
  if (
    !/^\/(?:$|article$|ss$|archives$|search$|categories$|tags$|category\/|tag\/)/.test(
      path,
    )
  )
    return href;
  return (
    (locale === "en" ? (path === "/" ? "/en/" : `/en${path}`) : path) +
    url.search +
    url.hash
  );
}
