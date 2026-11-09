"use client";
import { randomUUID } from "@/core/browser/crypto";
import { queryFonts, uploadMedia } from "@/core/contracts/settings";
import type { FontAsset } from "@/core/contracts/settings";
import {
  useAssetLibrary,
  InvalidUpload,
  type LibraryAdapter,
} from "../media/asset-library";
import type { MediaUploadPayload } from "../media/media-library";

const adapter: LibraryAdapter<FontAsset, MediaUploadPayload> = {
  read: async (base, query, page, _kind, csrf, signal) =>
    (await queryFonts(base, { query, page }, csrf, { signal })).data,
  prepare: async (file) => {
    if (
      !file.size ||
      file.size > 20 * 1024 * 1024 ||
      !/\.(woff2?|ttf|otf)$/i.test(file.name)
    )
      throw new InvalidUpload("请选择 20 MB 内的 WOFF2、WOFF、TTF 或 OTF 字体");
    return {
      metadata: {
        filename: file.name,
        upload_id: randomUUID(),
        purpose: "font",
      },
      file,
    };
  },
  write: async (base, payload, csrf, options) => {
    const result = (
      await uploadMedia(base, payload.metadata, payload.file, csrf, {
        ...options,
        timeoutMs: 120000,
      })
    ).data;
    const fonts = (await queryFonts(base, { query: result.id, page: 1 }, csrf))
      .data;
    const font = fonts.items.find((item) => item.id === result.id);
    if (!font) throw new Error("字体已上传，请重新读取列表。");
    return { ...font, reused: result.reused };
  },
  unavailable: "暂时无法读取字体，请重试。",
  rejected: "字体未通过校验，请检查文件后重试。",
};
export function useFontLibrary() {
  return useAssetLibrary(adapter);
}
