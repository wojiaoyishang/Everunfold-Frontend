import type { SettingField, SettingsModel } from "@everunfold/plugin-sdk";

/** The plugin translates labels, then delegates the actual controls to the theme. */
function field(
  key: string,
  label: string,
  control: string,
  defaultValue: unknown,
  props: Record<string, unknown> = {},
): SettingField {
  return {
    key,
    label,
    component: "core.honors.field",
    default: defaultValue,
    props: { control, ...props },
  };
}

export const honorsSettings: SettingsModel = {
  fields: [
    field(
      "intro",
      "页面介绍",
      "form.textarea",
      "每一张证书，都是一段努力的记录。",
      { maxLength: 2000 },
    ),
    field("layout", "展示布局", "form.select", "grid", {
      choices: [
        { value: "grid", label: "证书网格" },
        { value: "timeline", label: "成长时间线" },
      ],
    }),
    field("sort", "默认排序", "form.select", "manual", {
      choices: [
        { value: "manual", label: "录入顺序" },
        { value: "newest", label: "从新到旧" },
        { value: "oldest", label: "从旧到新" },
      ],
    }),
    field("search_enabled", "显示搜索", "form.boolean", true),
    field("year_filter", "显示年份筛选", "form.boolean", true),
    field("show_summary", "显示统计", "form.boolean", true),
    {
      ...field("honors", "荣誉记录", "form.list", [], {
        maxItems: 300,
        addLabel: "添加荣誉",
        itemLabel: "荣誉",
        emptyText: "添加一项经历，选择证书图片，也可以只记录文字。",
      }),
      fields: [
        field("title", "荣誉名称", "form.text", "", {
          required: true,
          maxLength: 200,
        }),
        field("category", "分类", "form.text", "荣誉类", { maxLength: 80 }),
        field("date", "时间文字", "form.text", "", { maxLength: 32 }),
        field("award", "奖项或任职", "form.text", "", { maxLength: 200 }),
        field("description", "补充说明", "form.textarea", "", {
          maxLength: 3000,
        }),
        {
          key: "image_url",
          label: "证书图片",
          component: "core.honors.image",
          default: "",
        },
        field("link_url", "相关链接", "form.text", "", { maxLength: 2048 }),
      ],
    },
  ],
};
