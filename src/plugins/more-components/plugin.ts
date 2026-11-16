import type {
  BuilderComponentDefinition,
  FrontendPlugin,
} from "@everunfold/plugin-sdk";

const id = "core.more-components";
const definitions = [
  {
    type: `${id}.disclosure`,
    label: "折叠区",
    group: "interactive",
    container: true,
    fields: [
      { key: "title", label: "标题", type: "text", default: "展开详情" },
      { key: "open", label: "默认展开", type: "boolean", default: false },
    ],
  },
  {
    type: `${id}.notice`,
    label: "提示框",
    container: true,
    fields: [
      { key: "title", label: "标题", type: "text", default: "" },
      {
        key: "tone",
        label: "样式",
        type: "select",
        default: "info",
        options: [
          { value: "info", label: "说明" },
          { value: "warning", label: "提醒" },
        ],
      },
    ],
  },
  {
    type: `${id}.people`,
    label: "人物分组",
    group: "layout",
    container: true,
    fields: [
      { key: "title", label: "分组标题", type: "text", default: "同行者" },
      {
        key: "appearance",
        label: "人物布局",
        type: "select",
        default: "cloud",
        options: [
          { value: "cloud", label: "姓名云" },
          { value: "cards", label: "人物卡片" },
        ],
      },
    ],
  },
  {
    type: `${id}.greeting`,
    label: "姓名与寄语",
    group: "interactive",
    fields: [
      { key: "name", label: "姓名", type: "text", default: "" },
      { key: "subtitle", label: "副标题", type: "text", default: "" },
      { key: "avatar", label: "头像", type: "media", default: "" },
      { key: "message", label: "寄语", type: "textarea", default: "" },
    ],
  },
  {
    type: `${id}.video`,
    label: "视频播放器",
    group: "media",
    fields: [
      {
        key: "source",
        label: "视频",
        type: "media",
        mediaKind: "video",
        default: "",
      },
      { key: "poster", label: "视频封面", type: "media", default: "" },
      { key: "title", label: "视频标题", type: "text", default: "" },
      {
        key: "captions",
        label: "字幕地址（WebVTT）",
        type: "url",
        default: "",
      },
      {
        key: "language",
        label: "字幕语言代码",
        type: "text",
        default: "zh-CN",
      },
    ],
  },
] satisfies BuilderComponentDefinition[];

export default {
  id,
  version: "1.0.0",
  title: "更多组件",
  description: "折叠说明、提示框、人物分组、姓名与寄语和视频播放器。",
  author: "Everunfold",
  readme:
    "在页面或文章的组件编辑器中使用。可将说明、按钮等放入折叠区和提示框，将多个人物寄语放入同一个分组，并从媒体库选取视频与封面。",
  setup({ builder, components }) {
    for (const definition of definitions) {
      components.register(definition.type);
      builder.register({ ...definition, component: definition.type });
    }
  },
} satisfies FrontendPlugin;
