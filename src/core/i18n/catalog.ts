import regions from "@/core/contracts/language-regions";
import type {
  LanguageCatalog as StoredCatalog,
  LanguageDefinition,
} from "@/core/contracts/settings";

export type Language = Required<LanguageDefinition>;
export type LanguageCatalog = Omit<Required<StoredCatalog>, "languages"> & {
  languages: Language[];
};
function regionalFlag(region: string) {
  return [...region.toUpperCase()]
    .map((char) => String.fromCodePoint(0x1f1e6 + char.charCodeAt(0) - 65))
    .join("");
}
export function defaultFlag(code: string) {
  const parts = code.split("-");
  const region =
    parts
      .slice(1)
      .find((part) => /^[A-Za-z]{2}$/.test(part))
      ?.toUpperCase() ??
    (regions as Record<string, string>)[parts[0].toLowerCase()];
  return region ? regionalFlag(region) : "🏳️";
}
export function normalizedFlag(code: string, value?: string) {
  const flag = value?.trim();
  if (flag && /^[A-Za-z]{2}$/.test(flag)) return regionalFlag(flag);
  return flag || defaultFlag(code);
}
/** Initial data and offline fallback only; all runtime choices come from site settings. */
export const initialCatalog: LanguageCatalog = {
  default_code: "zh-CN",
  languages: [
    {
      code: "zh-CN",
      name: "简体中文",
      flag: defaultFlag("zh-CN"),
      prefix: "",
      enabled: true,
      ui_locale: "zh-CN",
    },
    {
      code: "en",
      name: "English",
      flag: defaultFlag("en"),
      prefix: "/en",
      enabled: true,
      ui_locale: "en",
    },
  ],
};
export function normalizeCatalog(
  value: StoredCatalog | undefined,
): LanguageCatalog {
  return {
    default_code: value?.default_code ?? initialCatalog.default_code,
    languages: (value?.languages ?? initialCatalog.languages).map((item) => ({
      ...item,
      flag: normalizedFlag(item.code, item.flag),
      prefix: item.prefix ?? "",
      enabled: item.enabled ?? true,
      ui_locale: item.ui_locale ?? "en",
    })),
  };
}
export function languageName(catalog: LanguageCatalog, code?: string) {
  const selected = code ?? catalog.default_code;
  return (
    catalog.languages.find((item) => item.code === selected)?.name ?? selected
  );
}
export function activeLanguage(catalog: LanguageCatalog, code: string) {
  return (
    catalog.languages.find((item) => item.code === code && item.enabled) ??
    catalog.languages.find((item) => item.code === catalog.default_code)!
  );
}
