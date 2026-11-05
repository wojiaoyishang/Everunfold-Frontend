import flags from "./data/flags.json";
import regions from "@/generated/language-regions.json";
import { defaultFlag, type Language } from "./catalog";
import { localeOf, nativeMessageLocale, type MessageLocale } from "./locale";

const special: Record<string, string> = {
  "chequered flag": "方格旗",
  "triangular flag": "三角旗",
  "crossed flags": "交叉旗",
  "black flag": "黑旗",
  "white flag": "白旗",
  "rainbow flag": "彩虹旗",
  "transgender flag": "跨性别旗",
  "pirate flag": "海盗旗",
  England: "英格兰",
  Scotland: "苏格兰",
  Wales: "威尔士",
};
export function flagChoices(locale: MessageLocale) {
  const names = new Intl.DisplayNames([locale], { type: "region" }),
    english = new Intl.DisplayNames(["en"], { type: "region" });
  return flags.map((item) => {
    const country = /^[A-Z]{2}$/.test(item.code);
    const localized = country
      ? names.of(item.code)
      : locale === "zh-CN"
        ? special[item.name]
        : undefined;
    const name = localized && localized !== item.code ? localized : item.name;
    return {
      ...item,
      label: name,
      search: searchText(
        `${name} ${item.name} ${item.code} ${item.emoji} ${country ? english.of(item.code) : ""}`,
      ),
    };
  });
}
export function searchText(value: string) {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}
export function presetLanguages(locale: MessageLocale) {
  const display = new Intl.DisplayNames([locale], { type: "language" }),
    english = new Intl.DisplayNames(["en"], { type: "language" });
  return [
    ...Object.keys(regions).map((code) => (code === "zh" ? "zh-CN" : code)),
    "zh-TW",
    "zh-HK",
    "en-US",
    "fr-CA",
    "pt-BR",
    "es-MX",
  ].map((code) => {
    const item = customLanguage(
      code,
      new Intl.DisplayNames([code], { type: "language" }).of(code) ?? code,
    );
    if (code === "zh-CN") item.name = "简体中文";
    if (code === "zh-TW") item.name = "繁體中文";
    return {
      ...item,
      description: display.of(code) ?? code,
      search: searchText(
        `${code} ${item.name} ${display.of(code)} ${english.of(code)}`,
      ),
    };
  });
}
export function customLanguage(
  code: string,
  name: string,
  prefix?: string,
): Language {
  const canonical = localeOf(code);
  return {
    code: canonical,
    name: name.trim(),
    prefix: prefix ?? "/" + canonical.toLowerCase(),
    flag: defaultFlag(canonical),
    enabled: true,
    ui_locale: nativeMessageLocale(canonical) ?? "en",
  };
}
