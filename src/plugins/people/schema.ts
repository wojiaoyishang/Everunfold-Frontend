import type { SettingsModel } from "@everunfold/plugin-sdk";

export const peopleSettings: SettingsModel = {
  fields: [
    {
      key: "intro",
      label: "页面介绍",
      component: "form.textarea",
      default: "有些相遇，让旅途有了温度。点开一个名字，读一段留给彼此的话。",
      props: { maxLength: 2000 },
    },
    {
      key: "search_enabled",
      label: "显示人物搜索",
      component: "form.boolean",
      default: true,
    },
    {
      key: "layout",
      label: "人物布局",
      component: "form.select",
      default: "cloud",
      props: {
        choices: [
          { value: "cloud", label: "姓名云" },
          { value: "cards", label: "人物卡片" },
        ],
      },
    },
    {
      key: "people",
      label: "人物",
      component: "form.list",
      default: [],
      props: {
        maxItems: 300,
        addLabel: "添加人物",
        itemLabel: "人物",
        emptyText: "添加姓名和分组，再写下寄语。列表顺序就是前台展示顺序。",
      },
      fields: [
        {
          key: "name",
          label: "姓名",
          component: "form.text",
          default: "",
          props: { maxLength: 80, minLength: 1, required: true },
        },
        {
          key: "group",
          label: "分组",
          component: "form.text",
          default: "同行者",
          props: { maxLength: 80 },
        },
        {
          key: "avatar_url",
          label: "头像地址",
          component: "form.text",
          default: "",
          props: { maxLength: 2048 },
        },
        {
          key: "message",
          label: "寄语",
          component: "core.people.message",
          default: "",
          props: { maxLength: 5000 },
        },
      ],
    },
  ],
};
