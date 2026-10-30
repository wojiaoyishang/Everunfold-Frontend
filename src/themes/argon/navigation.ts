import type { Site } from "@/core/content/types";
import { publicHref } from "@/core/content/urls";
import type { IconName } from "./components/icon";

export interface NavigationItem {
  label: string;
  href: string;
  icon: IconName;
  children?: { label: string; href: string }[];
}

const known: Partial<Record<string, Omit<NavigationItem, "href">>> = {
  "/": { label: "最新文章", icon: "home" },
  "/archives": {
    label: "文章归档",
    icon: "archive",
    children: [
      { label: "按时间浏览", href: "/archives" },
      { label: "文章分类", href: "/categories" },
      { label: "文章标签", href: "/tags" },
    ],
  },
  "/links": { label: "一路有你", icon: "leaf" },
  "/myhonor": { label: "我的荣誉", icon: "star" },
  "/about": { label: "关于网站", icon: "bell" },
};

/** Presentation overrides for the reference theme, without inventing business data. */
export function siteNavigation(site: Site): NavigationItem[] {
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
        label: item.label,
        href,
        icon: href.includes("lab.lovepikachu.top")
          ? ("flask" as const)
          : ("link" as const),
        ...reference,
      },
    ];
  });
}

export function campfireIdentity(site: Site) {
  const campfire = site.author === "Yishang";
  return {
    title: site.hero_title || site.name,
    alias: campfire ? "(梦吃丘)" : "",
    subtitle: campfire ? "等待着、探索着、期待着" : site.description,
    social: campfire
      ? [
          { label: "BiliBili", href: "https://space.bilibili.com/197741923" },
          { label: "Gitee", href: "https://gitee.com/wojiaoyishang" },
        ]
      : [],
  };
}
