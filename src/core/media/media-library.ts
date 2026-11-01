"use client";
import { queryMedia, uploadMedia } from "@/generated/settings-client";
import type {
  MediaItem,
  MediaQuery,
  MediaUpload,
} from "@/generated/settings-contract";
import {
  useAssetLibrary,
  InvalidUpload,
  type LibraryAdapter,
} from "./asset-library";
type Upload = { metadata: MediaUpload; file: File };
const adapter: LibraryAdapter<MediaItem, Upload> = {
  read: async (base, query, page, kind, csrf, signal) =>
    (
      await queryMedia(
        base,
        { query, page, kind: kind as MediaQuery["kind"] },
        csrf,
        { signal },
      )
    ).data,
  prepare: async (file, kind) => {
    const video = /\.(mp4|webm)$/i.test(file.name);
    const image = /\.(svg|png|jpe?g|webp)$/i.test(file.name);
    if (
      (!video && !image) ||
      (kind === "image" && !image) ||
      (kind === "video" && !video)
    )
      throw new InvalidUpload(
        kind === "video"
          ? "请选择 MP4 或 WebM 视频。"
          : "请选择 SVG、PNG、JPEG、WebP 图片或 MP4、WebM 视频。",
      );
    const limit = video
      ? 128 * 1024 * 1024
      : /\.svg$/i.test(file.name)
        ? 1048576
        : 20 * 1024 * 1024;
    if (!file.size || file.size > limit)
      throw new InvalidUpload(
        "图片最大 20 MB，SVG 最大 1 MB，视频最大 128 MB。",
      );
    return {
      metadata: { filename: file.name, upload_id: crypto.randomUUID() },
      file,
    };
  },
  write: async (base, payload, csrf) =>
    (
      await uploadMedia(base, payload.metadata, payload.file, csrf, {
        timeoutMs: 120000,
      })
    ).data,
  unavailable: "媒体库暂时无法读取，请稍后重试。已填写的地址会保留。",
  rejected:
    "文件未通过校验：静态图片最大 20 MB（SVG 1 MB），MP4/WebM 视频最大 128 MB。",
};
export function useMediaLibrary(kind: NonNullable<MediaQuery["kind"]>) {
  return useAssetLibrary(adapter, kind);
}
