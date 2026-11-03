"use client";
import { useDeferredValue, useMemo, type Ref } from "react";
import { renderContent } from "@/core/rendering/content";
import type { MediaURL } from "@/generated/content-admin-contract";
import styles from "./markdown-editor.module.css";
export function BlockPreview({
  value,
  format,
  label,
  media = {},
  previewRef,
}: {
  value: string;
  format: "markdown" | "html";
  label: string;
  media?: Record<string, MediaURL>;
  previewRef?: Ref<HTMLDivElement>;
}) {
  const deferred = useDeferredValue(value);
  const html = useMemo(
    () =>
      renderContent({
        id: "block-preview",
        content: [{ id: "block", type: format, content: deferred }],
        media_urls: media,
      }).html,
    [deferred, format, media],
  );
  return (
    <div
      className={styles.preview}
      ref={previewRef}
      role="region"
      aria-label={label}
      aria-busy={deferred !== value}
    >
      <div className="admin-draft-preview">
        {value.trim() ? (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        ) : (
          <p className={styles.empty}>输入正文后在这里预览。</p>
        )}
      </div>
    </div>
  );
}
