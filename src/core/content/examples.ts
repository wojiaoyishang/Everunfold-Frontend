import type { ContentPresentation } from "@/generated/presentation-contract";

/** Fictional UI fixtures, never written to the public snapshot or database. */
function moment(
  id: string,
  title: string,
  body: string,
  hour: number,
): ContentPresentation {
  const published = `2026-10-31T${String(hour).padStart(2, "0")}:00:00+08:00`;
  return {
    id: `preview-${id}`,
    type: "shuoshuo",
    title,
    path: `/shuoshuo/preview-${id}`,
    excerpt: body.replace(/!\[[^\]]*\]\([^)]*\)/g, "").slice(0, 100),
    language: "zh-CN",
    published_at: published,
    updated_at: published,
    author: "篝火旁的旅人",
    cover_url: null,
    reading_minutes: 0,
    word_count: body.length,
    categories: [],
    tags: [],
    comment_count: 0,
    pinned: false,
    content: [{ id: `${id}-body`, type: "markdown", content: body }],
    media_urls: {},
    comments_open: true,
    reaction_count: 0,
    access: "public",
    opens_at: null,
  };
}

export const exampleMoments: ContentPresentation[] = [
  moment(
    "starlight",
    "把片刻留在这里",
    "不一定每次都要写成一篇长文。有时候，一阵晚风、一句心情，就值得被记住。\n\n![篝火与星空](/reference/campfire-background.webp)\n\n这是说说界面的**示例内容**。图片可以单独放大，文字中的[链接](/ss)也能独立打开。",
    20,
  ),
  moment(
    "small-things",
    "",
    "今天的快乐很小：喝到了刚好的热茶，看见一朵很像皮卡丘的云。☕\n\n没有标题，也可以好好记录生活。",
    18,
  ),
  moment(
    "long-walk",
    "散步时想到的事",
    [
      "走得慢一点，原来会看到很多以前忽略的东西。以下是长说说的展示样例。",
      ...Array.from(
        { length: 7 },
        (_, i) =>
          `第 ${i + 1} 段路：风从树叶之间穿过去，街角的灯一盏接着一盏亮起来。偶尔停下来看看天空，才发现一天并没有想象中那么匆忙。生活可以被认真对待，也可以被轻轻记录。`,
      ),
      "> 愿每一个平常的瞬间，都能有一个安静的落点。",
      "这段随记没有真实出处，只用来展示参考资料的往返定位。[ref]虚构的散步笔记，阅读组件示例。[/ref]",
      "```javascript\nconst littleThings = ['晚风', '热茶', '星空'];\nconsole.log(littleThings.map((moment) => `把这一刻留在这里：${moment}`).join(' · '));\n```",
      "![星空](/reference/campfire-background.webp)\n\n![篝火](/reference/campfire-background.webp)",
    ].join("\n\n"),
    16,
  ),
  {
    ...moment(
      "quiet",
      "安静地留一会儿",
      "这是一条关闭评论的说说样例。已有文字仍能阅读，评论入口会说明当前状态。",
      14,
    ),
    comments_open: false,
  },
];

export const examplePaths = new Set(exampleMoments.map((item) => item.path));
