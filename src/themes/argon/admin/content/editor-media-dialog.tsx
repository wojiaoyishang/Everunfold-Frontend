"use client";
import type { MediaItem } from "@/core/contracts/settings";
import { MediaPickerDialog } from "../media/media-picker-dialog";
export function EditorMediaDialog({
  kind = "all",
  title,
  value,
  onPick,
  onClose,
}: {
  kind?: "all" | "image" | "video";
  title?: string;
  value?: string;
  onPick: (item: MediaItem) => void;
  onClose: () => void;
}) {
  return (
    <MediaPickerDialog
      title={title ?? (kind === "image" ? "选择封面" : "插入媒体")}
      kind={kind}
      value={value}
      confirmLabel={title ? "插入至正文" : "使用此图片"}
      onPick={onPick}
      onClose={onClose}
    />
  );
}
