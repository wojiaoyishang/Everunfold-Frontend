import type { PluginShortcode } from "@everunfold/plugin-sdk";
import { galleryStyles, galleryScope } from "./styles";

export const gallery: PluginShortcode = {
  definition: {
    id: "8f403f7d-3b04-4d30-b848-c818c4ae91d3",
    name: "gallery",
    title: "图片画廊",
    description: "按媒体引用展示图片；多个 site://media/ID 用英文逗号分隔。",
    kind: "leaf",
    revision: 1,
    parameters: [
      {
        name: "id",
        label: "图片媒体 ID",
        type: "text",
        default: "",
        required: true,
      },
      {
        name: "columns",
        label: "列数",
        type: "select",
        default: "3",
        options: ["2", "3", "4"],
      },
    ],
    html: "",
    css: galleryStyles,
    scope: galleryScope,
  },
  classNames: [
    "ef-gallery",
    "ef-gallery-2",
    "ef-gallery-3",
    "ef-gallery-4",
    "ef-gallery-sample",
  ],
  mediaPicker: {
    parameter: "id",
    kind: "image",
    limit: 20,
    buttonLabel: "从媒体库添加图片",
    title: "选择画廊图片",
  },
  preview({ parameters }) {
    return parameters.id
      ? null
      : '<div class="ef-gallery ef-gallery-sample" role="img" aria-label="图片画廊样式示例"><span></span><span></span><span></span></div>';
  },
  render({ parameters, media }) {
    const ids = parameters.id
      .split(",")
      .map((id) => id.trim().replace(/^site:\/\/media\//, ""));
    if (
      !ids.length ||
      ids.length > 24 ||
      ids.some(
        (id) =>
          !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(id) ||
          !media[id],
      )
    )
      throw new Error("画廊需要当前正文已引用的有效图片媒体 ID");
    return `<div class="ef-gallery ef-gallery-${parameters.columns}">${ids.map((id) => `<figure><img src="site://media/${id}" alt=""></figure>`).join("")}</div>`;
  },
};
