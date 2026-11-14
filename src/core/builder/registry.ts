import type { BuilderComponentDefinition, BuilderField } from "./types";

const links = [
  { key: "label", label: "按钮文字", type: "text", default: "了解更多" },
  { key: "href", label: "链接", type: "url", default: "" },
] satisfies BuilderField[];

export const coreBuilderComponents: readonly BuilderComponentDefinition[] = [
  {
    type: "core.container",
    label: "容器",
    group: "layout",
    container: true,
  },
  {
    type: "core.grid",
    label: "网格",
    group: "layout",
    container: true,
    defaults: { layout: { direction: "grid", columns: 2 } },
  },
  {
    type: "core.divider",
    label: "分隔线",
    group: "layout",
  },
  {
    type: "core.spacer",
    label: "留白",
    group: "layout",
    fields: [
      {
        key: "height",
        label: "高度",
        type: "number",
        min: 4,
        max: 240,
        default: 32,
      },
    ],
  },
  {
    type: "core.heading",
    label: "标题",
    fields: [
      { key: "text", label: "标题文字", type: "text", default: "添加标题" },
      {
        key: "level",
        label: "标题级别",
        type: "select",
        options: ["2", "3", "4", "5", "6"].map((value) => ({
          value,
          label: "H" + value,
        })),
        default: "2",
        expose: false,
      },
    ],
  },
  {
    type: "core.markdown",
    label: "Markdown",
    fields: [
      { key: "source", label: "Markdown 正文", type: "markdown", default: "" },
    ],
  },
  {
    type: "core.html",
    label: "HTML",
    fields: [{ key: "source", label: "HTML 正文", type: "html", default: "" }],
  },
  {
    type: "core.shortcode",
    label: "短代码",
    fields: [
      { key: "source", label: "短代码", type: "shortcode", default: "" },
    ],
  },
  {
    type: "core.image",
    label: "图片",
    group: "media",
    fields: [
      { key: "source", label: "图片", type: "media", default: "" },
      { key: "alt", label: "替代文字", type: "text", default: "" },
      { key: "caption", label: "图片说明", type: "text", default: "" },
    ],
  },
  {
    type: "core.button",
    label: "按钮",
    fields: links,
  },
  {
    type: "core.icon",
    label: "图标",
    fields: [
      {
        key: "name",
        label: "图标",
        type: "select",
        options: [
          { value: "star", label: "星标" },
          { value: "heart", label: "心形" },
          { value: "book", label: "书本" },
          { value: "arrow", label: "箭头" },
          { value: "link", label: "链接" },
        ],
        default: "star",
      },
      { key: "label", label: "辅助文字", type: "text", default: "" },
    ],
  },
  {
    type: "core.banner",
    label: "横幅",
    group: "media",
    fields: [
      { key: "title", label: "标题", type: "text", default: "横幅标题" },
      { key: "text", label: "说明", type: "textarea", default: "" },
      { key: "image", label: "背景图片", type: "media", default: "" },
      { ...links[0], default: "" },
      links[1],
    ],
  },
  {
    type: "core.comment",
    label: "注释",
    fields: [
      {
        key: "text",
        label: "编辑注释",
        type: "textarea",
        default: "",
        expose: false,
      },
    ],
  },
  {
    type: "core.comments",
    label: "读者评论",
    group: "interactive",
  },
];

const fieldTypes = new Set([
  "text",
  "textarea",
  "number",
  "select",
  "boolean",
  "media",
  "markdown",
  "html",
  "shortcode",
  "url",
]);

export function defineBuilderComponent(definition: BuilderComponentDefinition) {
  if (
    !/^[a-z][a-z0-9_-]*\.[a-z][a-z0-9_.-]{0,63}$/.test(definition.type) ||
    definition.type.length > 100 ||
    !definition.label.trim() ||
    definition.label.length > 80 ||
    (definition.fields?.length ?? 0) > 32
  )
    throw new Error("Invalid builder component declaration");
  const keys = new Set<string>();
  for (const field of definition.fields ?? []) {
    if (
      !/^[a-z][a-z0-9_]{0,39}$/.test(field.key) ||
      keys.has(field.key) ||
      ["layout", "tablet", "mobile"].includes(field.key) ||
      !field.label.trim() ||
      !fieldTypes.has(field.type) ||
      (field.type === "select" && !field.options?.length)
    )
      throw new Error("Invalid builder field: " + field.key);
    keys.add(field.key);
  }
  return Object.freeze(structuredClone(definition));
}
