import type { ClientUpdate } from "@/generated/collaboration-contract";
import * as Y from "yjs";

export interface LocalDocument {
  epoch: string;
  state: Uint8Array;
  pending: ClientUpdate[];
  acknowledged?: Record<string, number>;
}

/** Executed inside the IDB read/write transaction, so concurrent tabs never replace one another. */
export function mergeLocalDocuments(
  prior: LocalDocument | undefined,
  next: LocalDocument,
): LocalDocument {
  if (prior && prior.epoch !== next.epoch) throw new Error("本地草稿版本不同");
  const acknowledged = { ...prior?.acknowledged, ...next.acknowledged };
  const updates = new Map(
    [...(prior?.pending ?? []), ...next.pending].map((item) => [
      item.update_id,
      item,
    ]),
  );
  return {
    epoch: next.epoch,
    state: prior ? Y.mergeUpdates([prior.state, next.state]) : next.state,
    pending: [...updates.values()].filter(
      (item) => acknowledged[item.update_id] === undefined,
    ),
    acknowledged,
  };
}

/** One IDB record atomically holds state plus durable outbox; tokens and policy are excluded. */
export async function openLocalDocument(key: string) {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("everunfold-private-drafts-v1", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("documents");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error("无法打开本地草稿存储"));
    request.onblocked = () => reject(new Error("本地草稿存储被其他页面占用"));
  });
  const channel =
    typeof BroadcastChannel === "undefined"
      ? null
      : new BroadcastChannel(`everunfold-draft:${key}`);
  return {
    read: () =>
      new Promise<LocalDocument | undefined>((resolve, reject) => {
        const tx = db.transaction("documents", "readonly");
        const read = tx.objectStore("documents").get(key);
        tx.oncomplete = () => resolve(read.result as LocalDocument | undefined);
        tx.onerror = () => reject(new Error("无法读取本地草稿"));
      }),
    write: (value: LocalDocument) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction("documents", "readwrite");
        const store = tx.objectStore("documents");
        const read = store.get(key);
        read.onsuccess = () => {
          try {
            store.put(
              mergeLocalDocuments(
                read.result as LocalDocument | undefined,
                value,
              ),
              key,
            );
          } catch {
            tx.abort();
          }
        };
        tx.oncomplete = () => {
          channel?.postMessage("changed");
          resolve();
        };
        tx.onerror = tx.onabort = () =>
          reject(new Error("本地草稿保存失败，请及时导出"));
      }),
    watch: (listener: () => void) => {
      if (channel) channel.onmessage = listener;
    },
    close: () => {
      channel?.close();
      db.close();
    },
  };
}
