import type { Site } from "@/core/content/types";
import { normalizePath, publicHref } from "@/core/content/urls";
import type { IconName } from "./components/icon";

export interface NavigationItem {
  label: string;
  href: string;
  icon: IconName;
  children?: {
    label: string;
    href: string;
    icon: IconName;
    description: string;
  }[];
}

const known: Partial<Record<string, Omit<NavigationItem, "href">>> = {
  "/": { label: "最新文章", icon: "home" },
  "/archives": {
    label: "文章归档",
    icon: "archive",
    children: [
      {
        label: "说说",
        href: "/ss",
        icon: "leaf",
        description: "收集日常的片刻与心情",
      },
      {
        label: "按时间浏览",
        href: "/archives",
        icon: "calendar",
        description: "沿着时间，重读旧故事",
      },
      {
        label: "高中日记",
        href: "/gzrj/",
        icon: "book",
        description: "那些写在纸上的青春",
      },
      {
        label: "文章分类",
        href: "/categories",
        icon: "folder",
        description: "按主题寻找想读的内容",
      },
      {
        label: "文章标签",
        href: "/tags",
        icon: "tag",
        description: "从一个关键词开始",
      },
    ],
  },
  "https://lab.lovepikachu.top": {
    label: "实验功能",
    icon: "flask",
    children: [
      {
        label: "123 云盘直链签名工具",
        href: "https://lab.lovepikachu.top/tools/123pan",
        icon: "link",
        description: "在实验室打开工具",
      },
      {
        label: "大学英语听力随身练",
        href: "https://lab.lovepikachu.top/document/englishlisten/",
        icon: "book",
        description: "听力练习与期末复习",
      },
    ],
  },
  "/links": { label: "一路有你", icon: "leaf" },
  "/myhonor": { label: "我的荣誉", icon: "star" },
  "/about": { label: "关于网站", icon: "bell" },
};

export function navigationIsActive(pathname: string, href: string): boolean {
  return (
    href.startsWith("/") && normalizePath(pathname) === normalizePath(href)
  );
}

export function navigationTarget(href: string) {
  return /^https?:\/\//.test(href)
    ? { target: "_blank" as const, rel: "noopener noreferrer" }
    : {};
}

/** Presentation overrides for the reference theme, without inventing business data. */
export function siteNavigation(site: Site): NavigationItem[] {
  if (site.settings)
    return (site.settings.site.navigation ?? []).map((item) => ({
      label: item.label,
      href: item.href,
      icon: item.icon ?? "link",
      children: item.children?.map((child) => ({
        label: child.label,
        href: child.href,
        icon: child.icon ?? "link",
        description: "",
      })),
    }));
  const items = site.navigation.length
    ? site.navigation
    : [
        { label: "最新文章", href: "/" },
        { label: "文章归档", href: "/archives" },
      ];
  return items.flatMap((item) => {
    const href = publicHref(item.href);
    if (!href) return [];
    const reference = known[href.replace(/\/$/, "") || "/"];
    return [
      {
        href,
        icon: href.includes("lab.lovepikachu.top")
          ? ("flask" as const)
          : ("link" as const),
        ...reference,
        // Public labels are authoritative; legacy hints only supply missing presentation.
        label: item.label,
      },
    ];
  });
}

export function campfireIdentity(site: Site) {
  const campfire = site.author === "Yishang";
  return {
    title: site.hero_title || site.name,
    alias: campfire ? "(梦吃丘)" : "",
    subtitle:
      campfire && !site.settings ? "等待着、探索着、期待着" : site.description,
    social: campfire
      ? [
          { label: "BiliBili", href: "https://space.bilibili.com/197741923" },
          { label: "Gitee", href: "https://gitee.com/wojiaoyishang" },
        ]
      : [],
  };
}
