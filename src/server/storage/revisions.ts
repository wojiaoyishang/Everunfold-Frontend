import { lstat, readdir, statfs, unlink } from "node:fs/promises";
import path from "node:path";

export interface RevisionFile {
  name: string;
  revision: number;
  barrier: boolean;
}

export async function revisionFiles(directory: string, pattern: RegExp) {
  const names = await readdir(directory).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  return names
    .flatMap((name): RevisionFile[] => {
      const match = pattern.exec(name);
      const revision = Number(match?.[1]);
      return Number.isSafeInteger(revision) && revision > 0
        ? [{ name, revision, barrier: match?.[2] === "intent" }]
        : [];
    })
    .sort((a, b) => b.revision - a.revision);
}

export type RevisionUsage = {
  files: number;
  bytes: number;
  reclaimable_bytes: number;
};
export type RemovedRevisions = { removed_files: number; removed_bytes: number };

async function fileSize(filename: string): Promise<number | null> {
  const info = await lstat(filename).catch((error: NodeJS.ErrnoException) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  return info?.isFile() ? info.size : null;
}

export async function revisionUsage(
  directory: string,
  files: RevisionFile[],
  verifiedRevision: number | null,
): Promise<RevisionUsage> {
  const result = { files: 0, bytes: 0, reclaimable_bytes: 0 };
  for (let offset = 0; offset < files.length; offset += 32) {
    const batch = files.slice(offset, offset + 32);
    const sizes = await Promise.all(
      batch.map((file) => fileSize(path.join(directory, file.name))),
    );
    for (const [index, file] of batch.entries()) {
      const size = sizes[index];
      if (size === null) continue;
      result.files += 1;
      result.bytes += size;
      if (
        !file.barrier &&
        verifiedRevision !== null &&
        file.revision < verifiedRevision
      )
        result.reclaimable_bytes += size;
    }
  }
  return result;
}

export async function pruneRevisions(
  directory: string,
  files: RevisionFile[],
  current: number,
): Promise<RemovedRevisions> {
  const result = { removed_files: 0, removed_bytes: 0 };
  // Keep all durable content intents. A newer, incomplete publication must still
  // prevent an older snapshot from serving, even after the payload was pruned.
  for (const file of files
    .filter((entry) => !entry.barrier && entry.revision < current)
    .reverse()
    .slice(0, 200)) {
    const filename = path.join(directory, file.name);
    const size = await fileSize(filename);
    if (size === null) continue;
    const removed = await unlink(filename).then(
      () => true,
      (error: NodeJS.ErrnoException) => {
        if (error.code === "ENOENT") return false;
        throw error;
      },
    );
    if (removed) {
      result.removed_files += 1;
      result.removed_bytes += size;
    }
  }
  return result;
}

export async function freeDiskBytes(directory: string): Promise<number | null> {
  try {
    const stat = await statfs(directory);
    const bytes = stat.bavail * stat.bsize;
    return Number.isSafeInteger(bytes) && bytes >= 0 ? bytes : null;
  } catch {
    return null;
  }
}
