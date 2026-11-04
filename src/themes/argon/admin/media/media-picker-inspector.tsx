"use client";
import { useMediaAttachment } from "@/core/media/media-attachment";
import { formatBytes } from "@/core/media/image-editor";
import type { MediaItem } from "@/generated/settings-contract";
import { Button, TextField } from "../../components/ui/primitives";
import { MediaPreview } from "./media-preview";
import styles from "./media-picker.module.css";

export function MediaPickerInspector({ item }: { item: MediaItem }) {
  const attachment = useMediaAttachment(item.id);
  const detail = attachment.detail;
  const info = detail ?? item;
  return (
    <div className={styles.details} aria-busy={attachment.loading}>
      <h3>附件资料</h3>
      <MediaPreview
        key={info.url}
        url={info.url}
        kind={info.kind}
        label={info.title || info.label}
        playable
      />
      <strong>{info.title || info.label}</strong>
      <dl className={styles.facts}>
        <div>
          <dt>文件名</dt>
          <dd>{info.label}</dd>
        </div>
        <div>
          <dt>文件类型</dt>
          <dd>{info.mime}</dd>
        </div>
        <div>
          <dt>文件大小</dt>
          <dd>{formatBytes(info.size)}</dd>
        </div>
        {detail?.width && detail.height && (
          <div>
            <dt>尺寸</dt>
            <dd>
              {detail.width} × {detail.height} px
            </dd>
          </div>
        )}
        <div>
          <dt>上传时间</dt>
          <dd>{new Date(info.created_at).toLocaleDateString("zh-CN")}</dd>
        </div>
        {detail && (
          <>
            {info.kind === "image" && (
              <div>
                <dt>替代文本</dt>
                <dd>{detail.metadata.alt_text || "未填写"}</dd>
              </div>
            )}
            <div>
              <dt>{info.kind === "image" ? "图片说明" : "说明"}</dt>
              <dd>{detail.metadata.caption || "未填写"}</dd>
            </div>
            <div>
              <dt>描述</dt>
              <dd>{detail.metadata.description || "未填写"}</dd>
            </div>
          </>
        )}
      </dl>
      {attachment.loading && <p role="status">正在读取附件资料…</p>}
      {attachment.error && (
        <div role="status">
          <p>{attachment.error}</p>
          <Button className="admin-button" onClick={attachment.reload}>
            重试
          </Button>
        </div>
      )}
      <label className={styles.address}>
        文件地址
        <TextField aria-label="所选文件地址" readOnly value={info.url} />
      </label>
    </div>
  );
}
