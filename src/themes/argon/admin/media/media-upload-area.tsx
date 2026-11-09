"use client";
import { UiText } from "@/core/i18n/provider";

import { FileDropZone } from "../../components/ui/file-drop-zone";
import { FilePicker } from "../../components/ui/file-picker";
import { Icon } from "../../components/icon";
import styles from "./media-picker.module.css";

export function MediaUploadArea({
  accept,
  onFiles,
}: {
  accept: string;
  onFiles: (files: File[]) => void;
}) {
  return (
    <FileDropZone className={styles.uploadArea} onFiles={onFiles}>
      <Icon name="upload" />
      <h3>
        <UiText text="拖放文件到这里" />
      </h3>
      <div className={styles.uploadChoice}>
        <FilePicker accept={accept} label="选择文件" onFiles={onFiles} />
        <span>
          <UiText text="支持多选 · 单文件不超过128 MB" />
        </span>
        <small>
          <UiText text="图片20 MB内 · SVG 1 MB内" />
        </small>
      </div>
    </FileDropZone>
  );
}
