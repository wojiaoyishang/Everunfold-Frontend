import type { TranslationOverrideItem } from "@/core/contracts/settings";

type TranslationScope = "public" | "admin" | "backend";

export const TRANSLATION_TRANSFER_FORMAT = "everunfold-translations";
export const TRANSLATION_TRANSFER_VERSION = 1;

const scopes: TranslationScope[] = ["public", "admin", "backend"];
const localePattern = /^[A-Za-z]{2,8}(?:-[A-Za-z0-9]{1,8})*$/;

export type TranslationImportEntry = {
  scope: TranslationScope;
  locale: string;
  key: string;
  value: string;
};

type TranslationValues = Record<
  TranslationScope,
  Record<string, Record<string, string>>
>;

function valuesByScope(): TranslationValues {
  return { public: {}, admin: {}, backend: {} };
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function draftIdentity(
  scope: TranslationScope,
  locale: string,
  key: string,
) {
  return `${scope}\0${locale}\0${key}`;
}

export function serializeTranslationBundle(
  overrides: readonly TranslationOverrideItem[],
  drafts: Record<string, string> = {},
  exportedAt = new Date().toISOString(),
) {
  const values = valuesByScope();
  for (const item of overrides) {
    values[item.scope][item.locale] ??= {};
    values[item.scope][item.locale][item.key] = item.value;
  }
  for (const [id, raw] of Object.entries(drafts)) {
    const [scope, locale, ...parts] = id.split("\0");
    const key = parts.join("\0");
    if (!scopes.includes(scope as TranslationScope) || !locale || !key)
      continue;
    const target = values[scope as TranslationScope];
    target[locale] ??= {};
    const value = raw.trim();
    if (value) target[locale][key] = value;
    else delete target[locale][key];
  }
  return JSON.stringify(
    {
      format: TRANSLATION_TRANSFER_FORMAT,
      version: TRANSLATION_TRANSFER_VERSION,
      exported_at: exportedAt,
      overrides: values,
    },
    null,
    2,
  );
}

export function parseTranslationBundle(source: string): {
  exportedAt: string;
  entries: TranslationImportEntry[];
} {
  let input: unknown;
  try {
    input = JSON.parse(source);
  } catch {
    throw new Error("导入文件不是有效的 JSON。");
  }
  if (
    !object(input) ||
    input.format !== TRANSLATION_TRANSFER_FORMAT ||
    input.version !== TRANSLATION_TRANSFER_VERSION ||
    typeof input.exported_at !== "string" ||
    !object(input.overrides)
  )
    throw new Error("导入文件不是受支持的 Everunfold 翻译文件。");

  for (const scope of Object.keys(input.overrides)) {
    if (!scopes.includes(scope as TranslationScope))
      throw new Error(`导入文件包含未知的翻译范围：${scope}`);
  }

  const entries: TranslationImportEntry[] = [];
  for (const scope of scopes) {
    const locales = input.overrides[scope];
    if (locales === undefined) continue;
    if (!object(locales)) throw new Error(`翻译范围 ${scope} 的数据格式无效。`);
    for (const [locale, messages] of Object.entries(locales)) {
      if (!localePattern.test(locale))
        throw new Error(`翻译语言代码无效：${locale}`);
      if (!object(messages))
        throw new Error(`翻译语言 ${locale} 的数据格式无效。`);
      for (const [key, value] of Object.entries(messages)) {
        if (!key || key.length > 512)
          throw new Error("导入文件包含无效的翻译键名。");
        if (typeof value !== "string" || value.length > 4000)
          throw new Error(`翻译“${key}”的文本格式或长度无效。`);
        entries.push({ scope, locale, key, value });
      }
    }
  }
  if (entries.length > 10_000)
    throw new Error("导入文件包含超过 10000 条翻译，请拆分后导入。");
  return { exportedAt: input.exported_at, entries };
}
