import type {
  CustomPageDefinition,
  SettingsModel,
} from "@everunfold/plugin-sdk";

const model = {
  fields: [
    {
      key: "cover_url",
      label: "书籍封面",
      component: "core.book.cover",
      default: "",
    },
    {
      key: "category_id",
      label: "文章分类",
      component: "core.book.category",
      default: "",
    },
    {
      key: "subtitle",
      label: "书籍副标题",
      component: "form.text",
      default: "",
      props: { maxLength: 160 },
    },
  ],
} satisfies SettingsModel;

export default {
  registration: {
    id: "core.book",
    version: "1.0.0",
    title: "书籍页面",
    description: "选择文章分类和书籍封面，把同一主题的文章展示为可翻阅的目录。",
    path: "/book",
    comments_open: false,
    defaults: Object.fromEntries(
      model.fields.map((field) => [field.key, field.default]),
    ),
    settings_schema: model,
  },
  component: "core.book.page",
  settingsModel: model,
  localized: true,
  layout: "wide",
  heading: "component",
  articleCollection: { categoryOption: "category_id", pageSize: 8 },
  imageViewer: { enabled: false },
} satisfies CustomPageDefinition;
