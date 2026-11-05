"use client";
import { useT } from "@/core/i18n/provider";
import { Select } from "./ui/select";
export function SearchLanguages({ all = false }: { all?: boolean }) {
  const t = useT();
  return (
    <Select
      name="languages"
      label={t("搜索语言")}
      defaultValue={all ? "all" : "current"}
      options={[
        { value: "current", label: t("当前语言") },
        { value: "all", label: t("所有语言") },
      ]}
    />
  );
}
