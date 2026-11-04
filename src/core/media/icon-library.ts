"use client";
import { randomUUID } from "@/core/browser/crypto";
import { queryIcons, uploadMedia } from "@/generated/settings-client";
import type { IconAsset } from "@/generated/settings-contract";
import {
  useAssetLibrary,
  InvalidUpload,
  type LibraryAdapter,
} from "./asset-library";
import type { MediaUploadPayload } from "./media-library";
const adapter: LibraryAdapter<IconAsset, MediaUploadPayload> = {
  read: async (base, query, page, _kind, csrf, signal) =>
    (await queryIcons(base, { query, page }, csrf, { signal })).data,
  prepare: async (file) => {
    if (
      !file.size ||
      file.size > 1048576 ||
      !/\.(svg|png|webp)$/i.test(file.name)
    )
      throw new InvalidUpload("请选择 1 MB 内的 SVG、PNG 或 WebP");
    return {
      metadata: {
        filename: file.name,
        upload_id: randomUUID(),
        purpose: "icon",
      },
      file,
    };
  },
  write: async (base, payload, csrf, options) =>
    (
      await uploadMedia(base, payload.metadata, payload.file, csrf, {
        ...options,
        timeoutMs: 120000,
      })
    ).data,
  unavailable: "上传图标暂时无法读取，内置图标仍可选择。",
  rejected: "文件未通过图标校验，请检查格式和大小后重新选择。",
};
export function useIconLibrary() {
  return useAssetLibrary(adapter);
}
