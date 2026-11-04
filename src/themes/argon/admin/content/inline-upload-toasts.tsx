"use client";
import { useEffect, useRef } from "react";
import type { InlineImageUploads } from "@/core/content-management/use-inline-image-uploads";
import { useToast } from "../../components/ui/toast/toast-provider";
/** Adapts the existing queue; notifications never own transfer or write article content. */
export function InlineUploadToasts({
  uploads,
}: {
  uploads: InlineImageUploads;
}) {
  const toast = useToast();
  const ids = useRef(new Set<string>()),
    previous = useRef(new Map<string, string>());
  useEffect(() => {
    for (const entry of uploads.entries) {
      const id = "inline-image:" + entry.id;
      ids.current.add(id);
      const signature = JSON.stringify([
        entry.state,
        entry.percent,
        entry.error,
        entry.result?.reused,
      ]);
      if (previous.current.get(id) === signature) continue;
      previous.current.set(id, signature);
      const active = ["queued", "uploading", "saving"].includes(entry.state);
      const done = entry.state === "done";
      toast.show({
        id,
        title: done
          ? entry.result?.reused
            ? "图片已复用"
            : "图片已插入"
          : entry.state === "saving"
            ? "正在保存图片"
            : entry.state === "queued"
              ? "等待上传图片"
              : entry.state === "failed"
                ? "图片上传失败"
                : entry.state === "cancelled"
                  ? "图片上传已停止"
                  : "正在上传图片",
        description: entry.name + (entry.error ? " · " + entry.error : ""),
        tone: active ? "loading" : done ? "success" : "error",
        progress: active ? entry.percent : undefined,
        duration: done ? 3500 : 0,
        dismissible: done,
        actions: active
          ? [{ label: "停止", onClick: () => uploads.queue.cancel(entry.id) }]
          : done
            ? []
            : [
                ...(entry.retryable
                  ? [
                      {
                        label: "重试",
                        onClick: () => uploads.queue.retry(entry.id),
                      },
                    ]
                  : []),
                {
                  label: "移除占位",
                  onClick: () => {
                    uploads.remove(entry.id, entry.context!);
                    uploads.queue.clearFinished([entry.id]);
                    toast.dismiss(id);
                  },
                },
              ],
      });
    }
  }, [uploads, toast]);
  useEffect(() => {
    const activeIds = ids.current;
    return () => {
      activeIds.forEach((id) => toast.remove(id));
    };
  }, [toast]);
  return null;
}
