"use client";
import { useLanguageCatalog, useLocale, useT } from "@/core/i18n/provider";
import { Select } from "./ui/select";
export function SearchLanguages({
  all = false,
  value,
}: {
  all?: boolean;
  value?: string;
}) {
  const t = useT();
  const { locale } = useLocale();
  const catalog = useLanguageCatalog();
  return (
    <Select
      name="languages"
      label={t("搜索语言")}
      defaultValue={value ?? (all ? "all" : locale)}
      options={[
        { value: "all", label: t("所有语言"), flag: "🌐" },
        ...catalog.languages.map((item) => ({
          value: item.code,
          label: item.name,
          flag: item.flag,
        })),
      ]}
    />
  );
}
