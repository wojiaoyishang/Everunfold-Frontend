"use client";
import { Select } from "./ui/select";
import { useT } from "@/core/i18n/provider";

export const searchTypes = [
  { value: "all", label: "全部内容" },
  { value: "article", label: "文章" },
  { value: "shuoshuo", label: "说说" },
  { value: "page", label: "页面" },
  { value: "glossary", label: "术语" },
];
export function SearchContentType({
  defaultValue = "all",
}: {
  defaultValue?: string;
}) {
  const t = useT();
  return (
    <Select
      programOptions
      name="type"
      label="搜索内容类型"
      options={searchTypes.map((item) => ({
        ...item,
        label: t(item.label),
      }))}
      defaultValue={defaultValue}
    />
  );
}
