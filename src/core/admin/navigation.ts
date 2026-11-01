/** Registered private destinations; labels do not define permissions. */
export const adminNavigation = [
  {
    id: "overview",
    href: "/admin",
    label: "工作台",
    description: "工作空间概览",
  },
  {
    id: "content",
    href: "/admin/content",
    label: "内容",
    description: "管理文章与说说",
  },
  {
    id: "media",
    href: "/admin/media",
    label: "媒体库",
    description: "整理图片与文件",
  },
] as const;
export type AdminDestination = (typeof adminNavigation)[number];
export function adminDestination(
  pathname: string,
): AdminDestination | undefined {
  return adminNavigation.find(
    (item) => item.href === pathname.replace(/\/$/, ""),
  );
}
