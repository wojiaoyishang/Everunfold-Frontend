import registrations from "@/generated/shortcode-builtins.json";
import type {
  PublicShortcode,
  ShortcodeItem,
} from "@/generated/settings-contract";

export type CatalogItem = Omit<ShortcodeItem, "origin"> & {
  origin: "backend" | "frontend" | "custom";
};
const gallery: PublicShortcode = {
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
  css: "",
  scope: "ef-sc-8f403f7d3b044d30b848c818c4ae91d3",
};
/** Trusted frontend registrations share the catalog, but expose no write capability. */
export const frontendShortcodes: readonly CatalogItem[] = [
  {
    id: gallery.id,
    origin: "frontend",
    editable: false,
    revision: 1,
    applied_revision: 1,
    archived: false,
    source: {
      name: gallery.name,
      title: gallery.title,
      description: gallery.description,
      kind: gallery.kind,
      parameters: gallery.parameters,
      html: "由前端图片画廊渲染器生成",
      css: "由主题的图片画廊样式提供",
      example_body: "",
    },
    compiled: gallery,
    versions: [],
  },
];
export const builtinShortcodes: readonly PublicShortcode[] = [
  ...registrations.map((item) => item.compiled as PublicShortcode),
  gallery,
];

export function shortcodeDefinitions(custom: readonly PublicShortcode[] = []) {
  const names = new Set<string>();
  return [
    ...builtinShortcodes,
    ...custom.filter((item) => item.name.startsWith("custom:")),
  ].map((item) => {
    if (names.has(item.name))
      throw new Error("Duplicate shortcode registration: " + item.name);
    names.add(item.name);
    return item;
  });
}

/** A private preview may replace an applied name before a new definition has its final ID. */
export function previewShortcodeDefinitions(
  definition: PublicShortcode,
  applied: readonly PublicShortcode[] = [],
) {
  return [
    ...applied.filter(
      (item) => item.id !== definition.id && item.name !== definition.name,
    ),
    ...(definition.name.startsWith("custom:") ? [definition] : []),
  ];
}
