import type { PageOption, PageRegistration } from "@/generated/pages-contract";
const text = (
  key: string,
  label: string,
  value = "",
  kind: PageOption["kind"] = "text",
  max = 200,
): PageOption => ({ key, label, kind, default: value, max_length: max });

/** Trusted declaration; this manifest is exported and explicitly installed during deployment. */
export const peopleDefinition: PageRegistration = {
  id: "core.people",
  version: "1.0.0",
  title: "一路有你",
  path: "/links",
  description: "记录同行的人，珍藏沿途的寄语。",
  fields: [
    text(
      "intro",
      "页面介绍",
      "有些相遇，让旅途有了温度。点开一个名字，读一段留给彼此的话。",
      "textarea",
      2000,
    ),
    {
      key: "search_enabled",
      label: "显示人物搜索",
      kind: "boolean",
      default: true,
    },
    {
      key: "layout",
      label: "人物布局",
      kind: "select",
      default: "cloud",
      choices: ["cloud", "cards"],
      choice_labels: { cloud: "姓名云", cards: "人物卡片" },
    },
    {
      key: "people",
      label: "人物",
      kind: "list",
      default: [],
      max_items: 300,
      fields: [
        { ...text("name", "姓名", "", "text", 80), min_length: 1 },
        text("group", "分组", "同行者", "text", 80),
        text("avatar_url", "头像地址", "", "url", 2048),
        text("message", "寄语", "", "textarea", 5000),
      ],
    },
  ],
};
