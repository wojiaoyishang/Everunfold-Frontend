export const stickerGroups = [
  {
    id: "dinosaur",
    label: "小恐龙",
    names: [
      "害羞",
      "发呆",
      "冒汗",
      "得意",
      "无力",
      "委屈",
      "吃东西",
      "好的",
      "疑惑",
      "低落",
      "闭眼",
      "睡觉",
      "困惑",
      "赞同",
      "抓狂",
      "生气",
    ],
  },
  {
    id: "flower",
    label: "花！",
    names: [
      "花花",
      "小草",
      "叶子",
      "星星",
      "太阳",
      "月亮",
      "喝水",
      "嘿嘿",
      "柠檬",
      "生日",
      "大海",
      "青菜",
      "贴贴",
      "文字",
    ],
  },
].map((group) => ({
  ...group,
  items: group.names.map((name, i) => ({
    label: `${group.label}·${name}`,
    src: `/reference/stickers/${group.id}/${i + 1}.jpg`,
  })),
}));
export const stickerSources = new Set(
  stickerGroups.flatMap((group) => group.items.map((item) => item.src)),
);
