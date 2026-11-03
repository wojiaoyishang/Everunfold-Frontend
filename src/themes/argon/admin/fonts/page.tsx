"use client";
import { useState } from "react";
import { useFontPreviews } from "@/core/media/font-preview";
import { useFontLibrary } from "@/core/media/font-library";
import { Button, TextField } from "../../components/ui/primitives";
import { FilePicker } from "../../components/ui/file-picker";
import { UploadQueueView } from "../../components/ui/upload-queue";
import { MediaDetailsDialog } from "../media/media-details";
import { AdminPageHeading } from "../components/page-heading";
import { formatBytes } from "@/core/media/image-editor";
import type { FontAsset } from "@/generated/settings-contract";
import { Icon } from "../../components/icon";
import styles from "./fonts.module.css";

export function FontLibraryPage() {
  const library = useFontLibrary();
  useFontPreviews(library.items);
  const [sample, setSample] = useState(
    "山川与日常，记录在这里。 The quick brown fox 0123456789",
  );
  const [selected, setSelected] = useState<FontAsset | null>(null);
  return (
    <div className="admin-settings-page admin-library-page">
      <AdminPageHeading title="字体库" />
      <div className="admin-library-toolbar">
        <TextField
          type="search"
          aria-label="搜索字体"
          placeholder="搜索字体或文件名…"
          value={library.query}
          onChange={(e) => library.setQuery(e.target.value)}
        />
        <div className="admin-upload-actions">
          <FilePicker
            label="上传字体"
            accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
            onFiles={library.upload}
          />
          <span className="admin-upload-hint">
            WOFF2 / WOFF / TTF / OTF<small>支持多选 · 单文件 20 MB 内</small>
          </span>
        </div>
      </div>
      <UploadQueueView
        items={library.uploads}
        onRetry={(id) => library.queue.retry(id)}
        onCancel={(id) => library.queue.cancel(id)}
        onClear={() => library.queue.clearFinished()}
      />
      <div className={styles.previewBar}>
        <label htmlFor="font-sample">预览文字</label>
        <TextField
          id="font-sample"
          value={sample}
          maxLength={240}
          onChange={(e) => setSample(e.target.value)}
        />
        <span>{library.total} 款字体</span>
      </div>
      {library.error && (
        <div className="admin-library-feedback" role="alert">
          {library.error}
          <Button className="admin-button" onClick={library.retry}>
            重试
          </Button>
        </div>
      )}
      <div className={styles.grid} aria-busy={library.loading}>
        {library.items.map((font) => (
          <article className={styles.card} key={font.id}>
            <div className={styles.cardHeading}>
              <div>
                <strong>{font.info.family}</strong>
                <small>{font.label}</small>
              </div>
              <span>{font.info.format.toUpperCase()}</span>
            </div>
            <div
              className={styles.sample}
              style={{ fontFamily: `"${font.css_family}", sans-serif` }}
            >
              {sample || "Aa 字体预览"}
            </div>
            <footer>
              <span>
                {font.info.style === "italic" ? "斜体" : "常规"} ·{" "}
                {font.info.weight_min === font.info.weight_max
                  ? font.info.weight_min
                  : `${font.info.weight_min}–${font.info.weight_max}`}{" "}
                · {formatBytes(font.size)}
              </span>
              <Button
                className="admin-button"
                aria-label={`查看 ${font.info.family} 资料`}
                onClick={() => setSelected(font)}
              >
                <Icon name="settings" />
                资料
              </Button>
            </footer>
          </article>
        ))}
      </div>
      {!library.loading && !library.error && !library.items.length && (
        <div className={styles.empty}>
          <Icon name="type" />
          <strong>{library.query ? "没有找到字体" : "还没有上传字体"}</strong>
          <span>上传后可在编辑器中选择。</span>
        </div>
      )}
      {library.total > 60 && (
        <div className="admin-library-pagination">
          <Button
            className="admin-button"
            disabled={library.page === 1}
            onClick={() => library.setPage(library.page - 1)}
          >
            上一页
          </Button>
          <span>
            {library.page} / {Math.ceil(library.total / 60)}
          </span>
          <Button
            className="admin-button"
            disabled={library.page * 60 >= library.total}
            onClick={() => library.setPage(library.page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
      {selected && (
        <MediaDetailsDialog
          item={{ ...selected, kind: "file" }}
          onClose={() => {
            setSelected(null);
            library.refresh();
          }}
          onChanged={library.refresh}
          onRemoved={() => {
            setSelected(null);
            library.refresh();
          }}
          onNavigate={() => setSelected(null)}
        />
      )}
    </div>
  );
}
