"use client";
import type { MediaItem } from "@/generated/settings-contract";
import { MediaPickerDialog } from "../media/media-picker-dialog";
export function EditorMediaDialog({
  kind = "all",
  title,
  onPick,
  onClose,
}: {
  kind?: "all" | "image" | "video";
  title?: string;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  return (
    <MediaPickerDialog
      title={title ?? (kind === "image" ? "选择封面" : "插入媒体")}
      kind={kind}
      confirmLabel={title ? "插入至正文" : "使用此图片"}
      onPick={onPick}
      onClose={onClose}
    />
  );
}
