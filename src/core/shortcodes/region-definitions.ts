import type { PublicShortcode } from "@/core/contracts/settings";

export type RegionKind = "reply-only" | "password-area";

export function regionKind(name: string): name is RegionKind {
  return name === "reply-only" || name === "password-area";
}

export const regionDefinitions: readonly PublicShortcode[] = [
  {
    id: "core.reply-only",
    name: "reply-only",
    title: "回复可见区域",
    description: "登录后发表评论，审核通过即可查看。",
    kind: "container",
    parameters: [],
    html: "<div>{{content}}</div>",
    css: "",
    scope: "ef-sc-62a28d862fcc4a23aa20103bd8f5efda",
    revision: 1,
  },
  {
    id: "core.password-area",
    name: "password-area",
    title: "密码保护区域",
    description: "访客输入区域口令后查看。",
    kind: "container",
    parameters: [
      { name: "credential", label: "区域口令", type: "text", required: true },
    ],
    html: "<div>{{content}}</div>",
    css: "",
    scope: "ef-sc-7a5a3122108c420a955cae832ee445c6",
    revision: 1,
  },
];
