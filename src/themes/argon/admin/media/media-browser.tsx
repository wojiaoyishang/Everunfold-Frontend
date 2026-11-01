"use client";
import { useState } from "react";
import { useMediaLibrary } from "@/core/media/media-library";
import type { MediaItem, MediaQuery } from "@/generated/settings-contract";
import { Button, TextField } from "../../components/ui/primitives";
import { FilePicker } from "../../components/ui/file-picker";
import { Icon } from "../../components/icon";
import { MediaPreview } from "./media-preview";
export function MediaBrowser({
  kind = "all",
  value,
  onSelect,
}: {
  kind?: NonNullable<MediaQuery["kind"]>;
  value?: string;
  onSelect?: (item: MediaItem) => void;
}) {
  const [filter, setFilter] = useState(kind);
  const library = useMediaLibrary(filter);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const pick = (item: MediaItem) => {
    setSelected(item);
    onSelect?.(item);
  };
  const items = library.items.filter(
    (item) => filter === "all" || item.kind === filter,
  );
  const accept =
    filter === "video"
      ? ".mp4,.webm,video/mp4,video/webm"
      : filter === "image"
        ? ".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
        : ".svg,.png,.jpg,.jpeg,.webp,.mp4,.webm";
  return (
    <div className="admin-media-browser">
      <div className="admin-library-toolbar">
        <TextField
          type="search"
          aria-label="搜索媒体"
          placeholder="搜索文件名称…"
          value={library.query}
          onChange={(e) => library.setQuery(e.target.value)}
        />
        <FilePicker
          accept={accept}
          disabled={library.uploading}
          label={library.uploading ? "正在上传…" : "上传文件"}
          onFile={(file) => void library.upload(file)}
        />
      </div>
      {kind === "all" && (
        <div className="admin-library-tabs" aria-label="媒体类型">
          {(
            [
              ["all", "全部"],
              ["image", "图片"],
              ["video", "视频"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              aria-pressed={filter === key}
              onClick={() => {
                setFilter(key);
                library.setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
      )}
      {library.error && (
        <div className="admin-library-feedback" role="status">
          {library.error}
          {library.canRetry && (
            <Button
              className="admin-button"
              disabled={library.uploading}
              onClick={() => void library.retry()}
            >
              重试
            </Button>
          )}
        </div>
      )}
      {library.lastUploaded && (
        <div className="admin-library-feedback" role="status">
          <Icon name="check" />
          <span>已上传：{library.lastUploaded.label}</span>
          {onSelect &&
            (filter === "all" || library.lastUploaded.kind === filter) && (
              <Button
                className="admin-button"
                onClick={() => pick(library.lastUploaded!)}
              >
                选择此文件
              </Button>
            )}
        </div>
      )}
      <div className="admin-media-grid" aria-busy={library.loading}>
        {items.map((item) => (
          <Button
            key={item.id}
            className="admin-media-tile"
            aria-label={`选择媒体 ${item.label}`}
            aria-pressed={(value ?? selected?.id) === item.id}
            onClick={() => pick(item)}
          >
            <MediaPreview
              key={item.url}
              url={item.url}
              kind={item.kind}
              label={item.label}
            />
            <span className="admin-media-tile-title">{item.label}</span>
            <span className="admin-media-tile-meta">
              {item.kind === "image" ? "图片" : "视频"} ·{" "}
              {item.size < 1048576
                ? `${Math.ceil(item.size / 1024)} KB`
                : `${(item.size / 1048576).toFixed(1)} MB`}
            </span>
            {(value ?? selected?.id) === item.id && (
              <Icon name="check" className="admin-media-selected" />
            )}
          </Button>
        ))}
      </div>
      {!items.length && (
        <p className="admin-library-empty">
          {library.loading
            ? "正在读取媒体…"
            : library.query
              ? "没有匹配的文件"
              : "还没有这类文件，上传后即可选择。"}
        </p>
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
          <span>第 {library.page} 页</span>
          <Button
            className="admin-button"
            disabled={library.page * 60 >= library.total}
            onClick={() => library.setPage(library.page + 1)}
          >
            下一页
          </Button>
        </div>
      )}
      {selected && !onSelect && (
        <div className="admin-media-selection">
          <MediaPreview
            key={selected.url}
            url={selected.url}
            kind={selected.kind}
            label={selected.label}
            playable
          />
          <div>
            <strong>{selected.label}</strong>
            <TextField
              aria-label="所选媒体地址"
              readOnly
              value={selected.url}
            />
          </div>
        </div>
      )}
      <p className="admin-library-caption">
        图片最大 20 MB（SVG 1 MB）· MP4 / WebM 视频最大 128 MB
      </p>
    </div>
  );
}
