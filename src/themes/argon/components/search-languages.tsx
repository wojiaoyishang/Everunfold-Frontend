"use client";
import { useLanguageCatalog, useLocale, useT } from "@/core/i18n/provider";
import { Select } from "./ui/select";
export function SearchLanguages({ all = false }: { all?: boolean }) {
  const t = useT();
  const { locale } = useLocale();
  const catalog = useLanguageCatalog();
  const current = catalog.languages.find((item) => item.code === locale);
  return (
    <Select
      name="languages"
      label={t("搜索语言")}
      defaultValue={all ? "all" : "current"}
      options={[
        {
          value: "current",
          label: current?.name ?? t("当前语言"),
          flag: current?.flag ?? "🌐",
        },
        { value: "all", label: t("所有语言"), flag: "🌐" },
      ]}
    />
  );
}
