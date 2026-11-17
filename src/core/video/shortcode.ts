import type { PublicShortcode } from "@/core/contracts/settings";
import { parseShortcodes } from "@/core/shortcodes/parser";
import { shortcodeCall } from "@/core/shortcodes/source";
import { videoDefaults, videoOptions, type VideoOptions } from "./player";

export const videoShortcode: PublicShortcode = {
  id: "250c3455-9f14-4bdb-921c-998635bf4bfa",
  name: "video",
  title: "视频播放器",
  description: "插入媒体库视频、视频直链或平台播放器。",
  kind: "leaf",
  parameters: [
    { name: "source", label: "视频来源", type: "url", required: true },
    { name: "title", label: "视频标题", type: "text" },
    { name: "poster", label: "视频封面", type: "url" },
    { name: "captions", label: "字幕地址（WebVTT）", type: "url" },
    {
      name: "language",
      label: "字幕语言代码",
      type: "text",
      default: videoDefaults.language,
    },
    { name: "max_width", label: "最大宽度", type: "number", default: "0" },
    {
      name: "autoplay",
      label: "静音自动播放",
      type: "boolean",
      default: "false",
    },
    { name: "loop", label: "循环播放", type: "boolean", default: "false" },
  ],
  html: "",
  css: "",
  scope: "ef-sc-250c34559f144bdb921c998635bf4bfa",
  revision: 1,
};

export function videoCall(options: VideoOptions) {
  return shortcodeCall(
    videoShortcode,
    Object.fromEntries(
      Object.entries(options).map(([key, value]) => [key, String(value)]),
    ),
  );
}

export function standaloneVideo(source: string, markdown = false) {
  const value = source.trim();
  if (!value.startsWith("{{<")) return null;
  const { nodes, diagnostics } = parseShortcodes(
    value,
    [videoShortcode],
    markdown,
  );
  const root = nodes[0];
  return nodes.length === 1 &&
    !diagnostics.length &&
    root.from === 0 &&
    root.to === value.length &&
    Object.keys(root.attributes).every((key) =>
      Object.hasOwn(videoDefaults, key),
    )
    ? videoOptions(root.attributes)
    : null;
}
