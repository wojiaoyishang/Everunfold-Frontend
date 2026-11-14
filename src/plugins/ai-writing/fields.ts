const seo = {
  seo_title: "搜索标题",
  seo_description: "搜索描述",
  seo_share_title: "分享标题",
  seo_share_description: "分享描述",
};

export const writingScenes = [
  {
    scene: "content.article.edit",
    label: "文章",
    fields: { excerpt: "摘要", ...seo },
  },
  {
    scene: "content.shuoshuo.edit",
    label: "说说",
    fields: seo,
  },
  {
    scene: "pages.edit",
    label: "页面",
    fields: { description: "页面说明", ...seo },
  },
  {
    scene: "glossary.edit",
    label: "术语",
    fields: { summary: "简短提示", ...seo },
  },
  {
    scene: "settings.site",
    label: "站点设置",
    fields: { description: "站点简介", seo_description: "搜索描述" },
  },
] as const;
