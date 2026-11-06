"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import { useMediaLibrary } from "@/core/media/media-library";
import type { MediaItem, MediaQuery } from "@/core/contracts/settings";
import { Button, TextField } from "../../components/ui/primitives";
import { UploadQueueView } from "../../components/ui/upload-queue";
import { FilePicker } from "../../components/ui/file-picker";
import { Select } from "../../components/ui/select";
import { Icon } from "../../components/icon";
import { MediaPreview } from "./media-preview";
import { MediaDetailsDialog } from "./media-details";
import { MediaUploadArea } from "./media-upload-area";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { formatBytes } from "@/core/media/image-editor";
export function MediaBrowser({
  kind = "all",
  value,
  onSelect,
  pickerTab,
}: {
  kind?: NonNullable<MediaQuery["kind"]>;
  value?: string;
  onSelect?: (item: MediaItem) => void;
  pickerTab?: "upload" | "library";
}) {
  const [view, setView] = useState<"grid" | "list">("grid");
  const [filter, setFilter] = useState(kind);
  const [trash, setTrash] = useState(false);
  const canUpload = can(useAdminAccount(), "media:upload");
  const requestKind = pickerTab === "upload" ? kind : filter;
  const library = useMediaLibrary(requestKind, trash);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const pick = (item: MediaItem) => {
    setSelected(item);
    onSelect?.(item);
  };
  const items = library.items.filter(
    (item) => filter === "all" || item.kind === filter,
  );
  const accept =
    requestKind === "video"
      ? ".mp4,.webm,video/mp4,video/webm"
      : requestKind === "image"
        ? ".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
        : "";
  return (
    <div className="admin-media-browser">
      {pickerTab === "upload" ? (
        canUpload ? (
          <MediaUploadArea accept={accept} onFiles={library.upload} />
        ) : (
          <p>
            <UiText text="当前账号没有上传媒体的权限。" />
          </p>
        )
      ) : (
        <div className="admin-library-toolbar">
          {pickerTab && kind === "all" && (
            <Select
              programOptions
              name="media-picker-kind"
              label="按类型筛选"
              value={filter}
              options={[
                { value: "all", label: "所有媒体" },
                { value: "image", label: "图片" },
                { value: "video", label: "视频" },
                { value: "file", label: "文件" },
              ]}
              onValueChange={(value) => {
                setFilter(value as typeof filter);
                library.setPage(1);
              }}
            />
          )}
          <TextField
            type="search"
            aria-label="搜索媒体"
            placeholder="搜索标题或文件名…"
            value={library.query}
            onChange={(e) => library.setQuery(e.target.value)}
          />
          {!pickerTab && canUpload && (
            <div className="admin-upload-actions">
              <FilePicker
                accept={accept}
                label="上传文件"
                onFiles={(files) => library.upload(files)}
              />
              <span className="admin-upload-hint">
                <UiText text="支持多选 · 单文件 128 MB 内" />
                <small>
                  <UiText text="图片 20 MB · SVG 1 MB" />
                </small>
              </span>
            </div>
          )}
        </div>
      )}
      {kind === "all" && !pickerTab && (
        <div className="admin-library-tabs" aria-label="媒体类型">
          {(
            [
              ["all", "全部"],
              ["image", "图片"],
              ["video", "视频"],
              ["file", "文件"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              aria-pressed={!trash && filter === key}
              onClick={() => {
                setTrash(false);
                setFilter(key);
                library.setPage(1);
              }}
            >
              {label}
            </Button>
          ))}
          {!onSelect && (
            <Button
              aria-pressed={trash}
              onClick={() => {
                setTrash(true);
                setFilter("all");
                library.setPage(1);
              }}
            >
              <UiText text="回收站" />
            </Button>
          )}
        </div>
      )}
      {library.error && (
        <div className="admin-library-feedback" role="status">
          {library.error}
          {library.canRetry && (
            <Button
              className="admin-button"
              onClick={() => void library.retry()}
            >
              <UiText text="重试" />
            </Button>
          )}
        </div>
      )}
      <UploadQueueView
        items={library.uploads}
        onRetry={(id) => library.queue.retry(id)}
        onCancel={(id) => library.queue.cancel(id)}
        onClear={() => library.queue.clearFinished()}
        onSelect={onSelect ? pick : undefined}
      />

      {pickerTab !== "upload" && (
        <>
          <div className="admin-media-library-summary">
            <span>
              {library.loading ? (
                <UiText text="正在读取…" />
              ) : (
                `共 ${library.total} 个文件`
              )}
            </span>
            <div aria-label="媒体展示方式">
              <Button
                className="admin-icon-button"
                aria-label="网格视图"
                aria-pressed={view === "grid"}
                onClick={() => setView("grid")}
              >
                <Icon name="grid" />
              </Button>
              <Button
                className="admin-icon-button"
                aria-label="列表视图"
                aria-pressed={view === "list"}
                onClick={() => setView("list")}
              >
                <Icon name="list" />
              </Button>
            </div>
          </div>
          <div
            className={`admin-media-grid${view === "list" ? " admin-media-list" : ""}`}
            aria-busy={library.loading}
          >
            {items.map((item) => (
              <Button
                key={item.id}
                className="admin-media-tile"
                aria-label={`${onSelect ? "选择媒体" : "查看附件"} ${item.title || item.label}`}
                aria-pressed={(value ?? selected?.id) === item.id}
                onClick={() => pick(item)}
              >
                <MediaPreview
                  key={item.url}
                  url={item.url}
                  kind={item.kind}
                  label={item.label}
                  deleted={item.deleted}
                />
                <span
                  className="admin-media-tile-title"
                  title={item.title || item.label}
                >
                  {item.title || item.label}
                </span>
                <span className="admin-media-tile-meta">
                  {item.deleted ? (
                    item.purge_pending ? (
                      <UiText text="待清理" />
                    ) : (
                      <UiText text="已删除" />
                    )
                  ) : item.kind === "image" ? (
                    <UiText text="图片" />
                  ) : item.kind === "video" ? (
                    <UiText text="视频" />
                  ) : (
                    <UiText text="文件" />
                  )}{" "}
                  · {formatBytes(item.size)}
                </span>
                {(value ?? selected?.id) === item.id && (
                  <Icon name="check" className="admin-media-selected" />
                )}
              </Button>
            ))}
          </div>
          {!items.length && (
            <p className="admin-library-empty">
              {library.loading ? (
                <UiText text="正在读取媒体…" />
              ) : library.query ? (
                <UiText text="没有匹配的文件" />
              ) : trash ? (
                <UiText text="回收站是空的" />
              ) : (
                <UiText text="还没有这类文件" />
              )}
            </p>
          )}
          {library.total > 60 && (
            <div className="admin-library-pagination">
              <Button
                className="admin-button"
                disabled={library.page === 1}
                onClick={() => library.setPage(library.page - 1)}
              >
                <UiText text="上一页" />
              </Button>
              <span>
                <UiText text="第" />
                {library.page} <UiText text="页" />
              </span>
              <Button
                className="admin-button"
                disabled={library.page * 60 >= library.total}
                onClick={() => library.setPage(library.page + 1)}
              >
                <UiText text="下一页" />
              </Button>
            </div>
          )}
        </>
      )}
      {selected && !onSelect && (
        <MediaDetailsDialog
          key={selected.id}
          item={selected}
          previous={
            items[items.findIndex((item) => item.id === selected.id) - 1]
          }
          next={
            items.findIndex((item) => item.id === selected.id) >= 0
              ? items[items.findIndex((item) => item.id === selected.id) + 1]
              : undefined
          }
          onRemoved={() => {
            setSelected(null);
            library.refresh();
          }}
          onClose={() => setSelected(null)}
          onNavigate={setSelected}
          onChanged={(item, created) => {
            if (created) setSelected(item);
            library.refresh();
          }}
        />
      )}
    </div>
  );
}
