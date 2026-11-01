"use client";
import { queryIcons, uploadIcon } from "@/generated/settings-client";
import type { IconAsset, IconUpload } from "@/generated/settings-contract";
import {
  useAssetLibrary,
  InvalidUpload,
  type LibraryAdapter,
} from "./asset-library";
const adapter: LibraryAdapter<IconAsset, IconUpload> = {
  read: async (base, query, page, _kind, csrf, signal) =>
    (await queryIcons(base, { query, page }, csrf, { signal })).data,
  prepare: async (file) => {
    if (
      file.size > 1048576 ||
      !file.size ||
      !/\.(svg|png|webp)$/i.test(file.name)
    )
      throw new InvalidUpload("请选择 1 MB 内的 SVG、PNG 或 WebP。");
    const bytes = new Uint8Array(await file.arrayBuffer());
    let binary = "";
    for (let start = 0; start < bytes.length; start += 8192)
      binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
    return {
      filename: file.name,
      upload_id: crypto.randomUUID(),
      data_base64: btoa(binary),
    };
  },
  write: async (base, payload, csrf) =>
    (await uploadIcon(base, payload, csrf)).data,
  unavailable: "上传图标暂时无法读取，内置图标仍可选择。",
  rejected:
    "文件未通过校验。请使用 1 MB 内的静态 SVG、PNG、WebP；SVG 不含脚本、样式或外链。",
};
export function useIconLibrary() {
  return useAssetLibrary(adapter);
}
