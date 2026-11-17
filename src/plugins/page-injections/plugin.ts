import { definePlugin } from "@everunfold/plugin-sdk";

export default definePlugin({
  id: "core.page-injections",
  version: "1.0.0",
  title: "页面代码注入",
  description: "按页面类型和 URL 配置 HTML、CSS 与 JavaScript。",
  surface: "admin",
  setup({ components, adminPages }) {
    components.register("core.page-injections.settings");
    adminPages.register({
      id: "settings",
      label: "页面代码注入",
      component: "core.page-injections.settings",
      permission: "settings:page-code",
      menu: { group: "core.appearance", order: 40 },
    });
  },
});
