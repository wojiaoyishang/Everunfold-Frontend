"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import type { DraftBlock } from "@/core/contracts/content-admin";
import type { MediaItem } from "@/core/contracts/settings";
import { UploadQueue } from "@/core/media/upload-queue";
import {
  mediaLibraryAdapter,
  type MediaUploadPayload,
} from "@/core/media/media-library";
import { mediaMarkup } from "./editor-fields";
import {
  replaceUploadMarker,
  uploadMarker,
} from "@/core/editor/upload-placeholders";

export function useInlineImageUploads({
  onTransform,
  onMedia,
}: {
  onTransform: (id: string, change: (block: DraftBlock) => string) => void;
  onMedia: (item: MediaItem) => void;
}) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const queue = useMemo(
    () =>
      new UploadQueue<MediaItem, MediaUploadPayload>({
        prepare: (file) => mediaLibraryAdapter.prepare(file, "image"),
        send: (payload, signal, onUploadProgress) =>
          mediaLibraryAdapter.write(baseUrl, payload, csrfToken, {
            signal,
            onUploadProgress,
          }),
        completed: () => {},
        rejected: mediaLibraryAdapter.rejected,
      }),
    [baseUrl, csrfToken],
  );
  useEffect(() => {
    queue.setCompleted((item, entry) => {
      onMedia(item);
      onTransform(entry.context, (block) =>
        replaceUploadMarker(
          block.content,
          entry.id,
          mediaMarkup(item, block.type, item.title || item.label),
        ),
      );
    });
  }, [queue, onTransform, onMedia]);
  useEffect(() => {
    queue.start();
    return () => queue.dispose();
  }, [queue]);
  const entries = useSyncExternalStore(
    queue.subscribe,
    queue.snapshot,
    queue.snapshot,
  );
  const remove = (id: string, blockId: string) => {
    queue.cancel(id);
    onTransform(blockId, (block) => replaceUploadMarker(block.content, id, ""));
  };
  return {
    queue,
    entries,
    items: (blockId: string) =>
      entries.filter((entry) => entry.context === blockId),
    add: (files: File[], blockId: string, insert: (value: string) => void) => {
      const added = queue.add(files, blockId) ?? [];
      if (added.length)
        insert(
          added.map((entry) => uploadMarker(entry.id, entry.name)).join("\n"),
        );
    },
    remove,
    clear: (blockId: string) => {
      for (const item of entries)
        if (
          item.context === blockId &&
          ["failed", "cancelled"].includes(item.state)
        )
          remove(item.id, blockId);
      queue.clearFinished(
        entries
          .filter((item) => item.context === blockId)
          .map((item) => item.id),
      );
    },
  };
}
export type InlineImageUploads = ReturnType<typeof useInlineImageUploads>;
