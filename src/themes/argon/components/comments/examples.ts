import type { CommentEntry } from "./model";

/** Deliberately fictional showcase data, labelled in the UI and never exported. */
export const exampleComments: readonly CommentEntry[] = [
  {
    id: "example-campfire-1",
    parentId: null,
    author: "路过的星星",
    body: "把日常写下来，就是把微小的光留住。\n很喜欢这里的星空，坐在篝火旁慢慢读完了。✨",
    createdAt: "2026-10-28T10:12:00Z",
    origin: "example",
    format: "plain",
  },
  {
    id: "example-campfire-2",
    parentId: "example-campfire-1",
    replyTo: "路过的星星",
    author: "篝火主人",
    body: "谢谢你停下来读一读。\n愿我们都能在平凡的日子里，找到值得记录的瞬间。☕",
    createdAt: "2026-10-28T10:28:00Z",
    origin: "example",
    format: "plain",
    host: true,
  },
  {
    id: "example-campfire-3",
    parentId: null,
    author: "晚风邮差",
    body: "> 故事还在继续。\n\n给认真记录生活的人一点 **鼓励**！也想试试这里的 `行内代码` 和表情 (๑•̀ㅂ•́)و✧",
    createdAt: "2026-10-29T04:20:00Z",
    origin: "example",
    format: "formatted",
  },
  {
    id: "example-campfire-4",
    parentId: "example-campfire-2",
    replyTo: "篝火主人",
    author: "路过的星星",
    body: "下次再来，带着新的故事。🌙",
    createdAt: "2026-10-29T05:03:00Z",
    origin: "example",
    format: "plain",
  },
];
