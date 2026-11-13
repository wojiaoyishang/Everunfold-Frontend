import type { Site } from "@/core/content/types";
import { normalizePath, publicHref } from "@/core/content/urls";
import type {
  MenuItem,
  SidebarNavigationPreferences,
} from "@/core/contracts/settings";
import { localizedMenuLabel } from "@/core/navigation/labels";

export interface NavigationItem {
  id?: string;
  label: string;
  href: string;
  icon: string;
  iconUrl?: string;
  description?: string;
  children?: NavigationItem[];
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
export function siteNavigation(
  site: Site,
  position: "header" | "sidebar" = "header",
): NavigationItem[] {
  if (site.settings) {
    const map = (item: MenuItem): NavigationItem[] => {
      const href = item.reference
        ? site.navigationResources?.[
            `${item.reference.kind}:${item.reference.id}`
          ]
        : item.href;
      if (!href) return [];
      return [
        {
          id: item.id,
          label: localizedMenuLabel(item, site.locale ?? "zh-CN"),
          href,
          icon: item.icon ?? "link",
          iconUrl: site.settings?.icon_urls?.[item.icon ?? ""],
          children: item.children?.length
            ? item.children.flatMap(map)
            : undefined,
        },
      ];
    };
    const shared =
      site.settings.theme?.navigation ?? site.settings.site.navigation ?? [];
    const configured =
      position === "sidebar"
        ? (site.settings.theme?.sidebar_navigation?.menu ?? shared)
        : shared;
    return configured.flatMap(map);
  }
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
        label: localizedMenuLabel(item, site.locale ?? "zh-CN"),
      },
    ];
  });
}

export function sidebarIdentity(
  site: Pick<Site, "author" | "name" | "description" | "hero_title">,
  authorTagline?: string,
  value?: SidebarNavigationPreferences,
) {
  const campfire = site.author === "Yishang";
  return {
    title: value?.title ?? (site.hero_title || site.name),
    alias: value?.alias ?? (campfire ? "(梦吃丘)" : ""),
    tagline:
      value?.tagline ??
      (authorTagline ||
        (campfire ? "等待着、探索着、期待着" : site.description)),
  };
}
