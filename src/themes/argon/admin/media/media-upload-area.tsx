"use client";
import { UiText } from "@/core/i18n/provider";

import { useRef, useState } from "react";
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
  const depth = useRef(0);
  const [dragging, setDragging] = useState(false);
  return (
    <section
      className={styles.uploadArea}
      data-dragging={dragging}
      aria-label="上传文件"
      onDragEnter={(event) => {
        if (!event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        depth.current++;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
      }}
      onDragLeave={() => {
        depth.current = Math.max(0, depth.current - 1);
        if (!depth.current) setDragging(false);
      }}
      onDrop={(event) => {
        event.preventDefault();
        depth.current = 0;
        setDragging(false);
        const files = Array.from(event.dataTransfer.files);
        if (files.length) onFiles(files);
      }}
    >
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
    </section>
  );
}
