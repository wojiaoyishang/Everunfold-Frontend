import type { AdminModuleRegistration } from "./registry";

/** Add built-in destinations here; keep actual page adapters under src/app. */
export const builtinAdminModule = {
  id: "core",
  groups: [
    { id: "core.workspace", label: "工作空间", order: 10 },
    { id: "core.settings", label: "设置", order: 20 },
  ],
  pages: [
    {
      id: "core.settings.site",
      href: "/admin/settings",
      label: "站点设置",
      description: "站点资料、菜单与搜索展示",
      icon: "settings",
      menu: { group: "core.settings", order: 10 },
    },
    {
      id: "core.settings.theme",
      href: "/admin/settings/theme",
      label: "主题设置",
      description: "阅读界面的默认外观",
      icon: "theme",
      menu: { group: "core.settings", order: 20 },
    },
    {
      id: "core.settings.system",
      href: "/admin/settings/system",
      label: "系统设置",
      description: "前端节点策略与同步状态",
      icon: "system",
      menu: { group: "core.settings", order: 30 },
    },
    {
      id: "core.overview",
      href: "/admin",
      label: "工作台",
      description: "工作空间概览",
      icon: "overview",
      menu: { group: "core.workspace", order: 10 },
    },
    {
      id: "core.content",
      href: "/admin/content",
      label: "内容",
      description: "管理文章与说说",
      icon: "content",
      menu: { group: "core.workspace", order: 20 },
    },
    {
      id: "core.media",
      href: "/admin/media",
      label: "媒体库",
      description: "整理图片与文件",
      icon: "media",
      menu: { group: "core.workspace", order: 30 },
    },
  ],
} as const satisfies AdminModuleRegistration;
