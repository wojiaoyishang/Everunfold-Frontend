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
export type MediaUploadPayload = { metadata: MediaUpload; file: File };
const adapter: LibraryAdapter<MediaItem, MediaUploadPayload> = {
  read: async (base, query, page, context, csrf, signal) => {
    const [kind, state] = context.split(":");
    return (
      await queryMedia(
        base,
        {
          query,
          page,
          kind: kind as MediaQuery["kind"],
          trash: state === "trash",
        },
        csrf,
        { signal },
      )
    ).data;
  },
  prepare: async (file, context) => {
    const kind = context.split(":")[0];
    const video = /\.(mp4|webm)$/i.test(file.name);
    const image = /\.(svg|png|jpe?g|webp)$/i.test(file.name);
    if ((kind === "image" && !image) || (kind === "video" && !video))
      throw new InvalidUpload(
        kind === "video"
          ? "请选择 MP4 或 WebM 视频"
          : "请选择 SVG、PNG、JPEG 或 WebP 图片",
      );
    const limit = image
      ? /\.svg$/i.test(file.name)
        ? 1048576
        : 20 * 1024 * 1024
      : 128 * 1024 * 1024;
    if (file.size > limit)
      throw new InvalidUpload(
        image ? "图片不超过 20 MB，SVG 不超过 1 MB" : "文件不超过 128 MB",
      );
    return {
      metadata: { filename: file.name, upload_id: crypto.randomUUID() },
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
  unavailable: "媒体库暂时无法读取，请稍后重试。",
  rejected: "文件格式或大小不符合要求，请检查后重新选择。",
};
export function useMediaLibrary(
  kind: NonNullable<MediaQuery["kind"]>,
  trash = false,
) {
  return useAssetLibrary(adapter, `${kind}:${trash ? "trash" : "active"}`);
}
