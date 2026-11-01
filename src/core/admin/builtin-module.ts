import type { AdminModuleRegistration } from "./registry";

/** Add built-in destinations here; keep actual page adapters under src/app. */
export const builtinAdminModule = {
  id: "core",
  groups: [{ id: "core.workspace", label: "工作空间", order: 10 }],
  pages: [
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
