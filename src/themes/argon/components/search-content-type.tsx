import { Select } from "./ui/select";

const searchTypes = [
  { value: "all", label: "全部内容" },
  { value: "article", label: "文章" },
  { value: "shuoshuo", label: "说说" },
  { value: "page", label: "页面" },
];
export function SearchContentType({
  defaultValue = "all",
}: {
  defaultValue?: string;
}) {
  return (
    <Select
      programOptions
      name="type"
      label="搜索内容类型"
      options={searchTypes}
      defaultValue={defaultValue}
    />
  );
}
