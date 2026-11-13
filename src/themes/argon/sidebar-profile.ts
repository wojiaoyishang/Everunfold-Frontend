import type { Site } from "@/core/content/types";
import type { SidebarProfilePreferences } from "@/core/contracts/settings";

export const sidebarDefaults: Required<SidebarProfilePreferences> = {
  display_name: "",
  show_tagline: true,
  show_stats: true,
  articles_url: "/archives",
  categories_url: "/categories",
  tags_url: "/tags",
  friends_title: "Links",
  personal_links: null,
  friend_links: null,
};

const campfirePersonal = [
  {
    id: "bilibili",
    label: "BiliBili 主页",
    href: "https://space.bilibili.com/197741923",
  },
  { id: "gitee", label: "Gitee 项目", href: "https://gitee.com/wojiaoyishang" },
];

const campfireFriends = [
  {
    id: "school-blog",
    label: "鳌江中学心情屋",
    href: "https://blog.sina.com.cn/ajzxxqw",
  },
  { id: "axinkai", label: "刺猬窝", href: "https://axinkai.top/" },
  {
    id: "mafumuffin",
    label: "画师 マフィン",
    href: "https://twitter.com/mafumuffin",
  },
  {
    id: "argon-theme",
    label: "博客 Argon 主题",
    href: "https://github.com/solstice23/argon-theme",
  },
];

export const sidebarStats = [
  { key: "articles", url: "articles_url", label: "文章" },
  { key: "categories", url: "categories_url", label: "分类" },
  { key: "tags", url: "tags_url", label: "标签" },
] as const;

export function sidebarProfile(
  site: Pick<Site, "author">,
  value?: SidebarProfilePreferences,
) {
  const profile = { ...sidebarDefaults, ...value };
  const campfire = site.author === "Yishang";
  return {
    ...profile,
    display_name: profile.display_name.trim() || site.author,
    personal_links:
      profile.personal_links ?? (campfire ? campfirePersonal : []),
    friend_links: profile.friend_links ?? (campfire ? campfireFriends : []),
  };
}
