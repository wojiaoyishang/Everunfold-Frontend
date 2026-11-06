import { randomUUID } from "@/core/browser/crypto";
import type { BranchUpload } from "@/core/contracts/collaboration";
import type { DraftFields } from "@/core/contracts/content-admin";

export type LocalBranch = {
  id: string;
  scope: string;
  payload: BranchUpload;
  updatedAt: number;
  submitted?: boolean;
  removedBlocks?: DraftFields["body"];
};
let lastTimestamp = 0;
export function branchTimestamp() {
  lastTimestamp = Math.max(Date.now(), lastTimestamp + 1);
  return lastTimestamp;
}

export function privateDraftFields(fields: DraftFields): DraftFields {
  return {
    title: fields.title,
    excerpt: fields.excerpt ?? "",
    body: fields.body.map((block) => ({ ...block })),
    settings: {
      ...structuredClone(fields.settings),
      visibility: "public",
      opens_at: null,
    },
  };
}

export function newLocalBranch(
  scope: string,
  payload: Omit<BranchUpload, "branch_id">,
): LocalBranch {
  const id = randomUUID();
  return {
    id,
    scope,
    updatedAt: branchTimestamp(),
    payload: {
      ...payload,
      fields: privateDraftFields(payload.fields),
      branch_id: id,
    },
  };
}

async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("everunfold-detached-branches-v1", 1);
    request.onupgradeneeded = () =>
      request.result
        .createObjectStore("branches", { keyPath: "id" })
        .createIndex("scope", "scope");
    request.onsuccess = () => resolve(request.result);
    request.onerror = request.onblocked = () =>
      reject(new Error("无法打开本地草稿存储"));
  });
}

export async function writeLocalBranch(branch: LocalBranch) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("branches", "readwrite");
      const store = tx.objectStore("branches");
      const request = store.get(branch.id);
      request.onsuccess = () => {
        const prior = request.result as LocalBranch | undefined;
        if (!prior || prior.updatedAt <= branch.updatedAt) store.put(branch);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () =>
        reject(new Error("本地草稿保存失败，请及时导出"));
    });
  } finally {
    db.close();
  }
}

export async function listLocalBranches(scope: string): Promise<LocalBranch[]> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("branches", "readonly");
      const request = tx.objectStore("branches").index("scope").getAll(scope);
      tx.oncomplete = () =>
        resolve(
          (request.result as LocalBranch[]).sort(
            (a, b) => b.updatedAt - a.updatedAt,
          ),
        );
      tx.onabort = tx.onerror = () => reject(new Error("无法读取本地草稿"));
    });
  } finally {
    db.close();
  }
}

export async function deleteLocalBranch(scope: string, id: string) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("branches", "readwrite");
      const store = tx.objectStore("branches");
      const request = store.get(id);
      request.onsuccess = () => {
        if ((request.result as LocalBranch | undefined)?.scope === scope)
          store.delete(id);
      };
      tx.oncomplete = () => resolve();
      tx.onabort = tx.onerror = () => reject(new Error("无法删除本地草稿"));
    });
  } finally {
    db.close();
  }
}
