"use client";
import { UiText } from "@/core/i18n/provider";

import type { UploadEntry } from "@/core/media/upload-queue";
import { Button } from "./primitives";
import { Icon } from "../icon";
import { formatBytes } from "@/core/media/image-editor";
export type UploadSelectionState =
  "selected" | "excluded" | "limit" | undefined;

export function UploadQueueView<T extends { reused?: boolean }>({
  items,
  onRetry,
  onCancel,
  onClear,
  onSelect,
  selectionState,
}: {
  items: UploadEntry<T>[];
  onRetry: (id: string) => void;
  onCancel: (id: string) => void;
  onClear: () => void;
  onSelect?: (result: T) => void;
  selectionState?: (result: T) => UploadSelectionState;
}) {
  if (!items.length) return null;
  const complete = items.filter((item) => item.state === "done").length;
  return (
    <section className="admin-upload-queue" aria-label="上传队列">
      <div className="admin-upload-queue-heading">
        <span>
          <UiText text="上传文件" />{" "}
          <small>
            {complete} / {items.length}
          </small>
        </span>
        {items.some((item) =>
          ["done", "failed", "cancelled"].includes(item.state),
        ) && (
          <Button className="admin-upload-text-button" onClick={onClear}>
            <UiText text="清除已结束" />
          </Button>
        )}
      </div>
      <div className="admin-upload-entries">
        {items.map((item) => {
          const selected = item.result
            ? selectionState?.(item.result)
            : undefined;
          const active = ["queued", "uploading", "saving"].includes(item.state);
          const label =
            item.state === "done"
              ? item.result?.reused
                ? "已复用"
                : "已上传"
              : item.state === "queued"
                ? "等待上传"
                : item.state === "saving"
                  ? "正在保存"
                  : item.state === "failed"
                    ? item.error
                    : item.state === "cancelled"
                      ? "已停止，可重试"
                      : item.percent === null
                        ? "正在上传"
                        : `${item.percent}%`;
          return (
            <div
              key={item.id}
              className="admin-upload-entry"
              data-state={item.state}
            >
              <Icon name={item.state === "done" ? "check" : "upload"} />
              <div className="admin-upload-entry-body">
                <div className="admin-upload-entry-title">
                  <span title={item.name}>{item.name}</span>
                  <small>{formatBytes(item.size)}</small>
                </div>
                {active && (
                  <div
                    className="admin-upload-progress"
                    role="progressbar"
                    aria-label={`${item.name} 上传进度`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={item.percent ?? undefined}
                    data-indeterminate={item.percent === null}
                  >
                    <span
                      style={
                        item.percent === null
                          ? undefined
                          : { width: `${item.percent}%` }
                      }
                    />
                  </div>
                )}
                <span className="admin-upload-status" role="status">
                  {label}
                </span>
              </div>
              {active ? (
                <Button
                  className="admin-icon-button"
                  aria-label={`停止上传 ${item.name}`}
                  onClick={() => onCancel(item.id)}
                >
                  <Icon name="close" />
                </Button>
              ) : item.state === "done" && onSelect && item.result ? (
                <Button
                  className="admin-upload-text-button"
                  disabled={selected === "excluded" || selected === "limit"}
                  onClick={() => onSelect(item.result!)}
                >
                  <UiText
                    text={
                      selected === "selected"
                        ? "取消选择"
                        : selected === "excluded"
                          ? "已添加"
                          : "选择"
                    }
                  />
                </Button>
              ) : (
                item.retryable && (
                  <Button
                    className="admin-upload-text-button"
                    onClick={() => onRetry(item.id)}
                  >
                    <UiText text="重试" />
                  </Button>
                )
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
