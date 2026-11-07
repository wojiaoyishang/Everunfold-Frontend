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
      id: "core.settings.plugins",
      href: "/admin/settings/plugins",
      label: "插件管理",
      description: "已部署插件与启用设置",
      icon: "extension",
      menu: { group: "core.settings", order: 25 },
    },
    {
      id: "core.users",
      href: "/admin/users",
      label: "用户管理",
      description: "用户资料、授权与账号状态",
      icon: "users",
      matchesChild: (path: string) =>
        path === "/admin/users/new" ||
        path === "/admin/users/presets" ||
        /^\/admin\/users\/[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(
          path,
        ),
      menu: { group: "core.workspace", order: 40 },
    },
    {
      id: "core.settings.api-keys",
      href: "/admin/settings/api-keys",
      label: "应用程序接入",
      description: "应用签名、权限目录与回调投递",
      icon: "extension",
      menu: { group: "core.settings", order: 40 },
    },
    {
      id: "core.shortcodes",
      href: "/admin/shortcodes",
      label: "短代码库",
      description: "预览和管理原生短代码模板",
      icon: "extension",
      menu: { group: "core.workspace", order: 37 },
    },
    {
      id: "core.fonts",
      href: "/admin/fonts",
      label: "字体库",
      description: "上传和预览字体",
      icon: "font",
      menu: { group: "core.workspace", order: 36 },
    },
    {
      id: "core.icons",
      href: "/admin/icons",
      label: "图标库",
      description: "管理内置与上传的图标",
      icon: "media",
      menu: { group: "core.workspace", order: 35 },
    },
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
      menu: null,
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
