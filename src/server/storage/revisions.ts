import { lstat, readdir, statfs, unlink } from "node:fs/promises";
import path from "node:path";
import { publishImmutableJson, syncDirectory } from "./immutable-json";

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
        ? [
            {
              name,
              revision,
              barrier: match?.[2] === "intent" || match?.[2] === "floor",
            },
          ]
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
  // Keep durable content intents so an incomplete publication still blocks older snapshots.
  return removeReplicaFiles(
    directory,
    files
      .filter((entry) => !entry.barrier && entry.revision < current)
      .reverse()
      .slice(0, 200)
      .map(({ name }) => name),
  );
}

export function clearedRevision(files: RevisionFile[]): number {
  return files.find(({ name }) => name.endsWith(".floor.json"))?.revision ?? 0;
}

export async function clearRevisions(
  directory: string,
  resource: string,
  files: RevisionFile[],
): Promise<RemovedRevisions> {
  const latest = files[0]?.revision;
  if (!latest) return { removed_files: 0, removed_bytes: 0 };
  const floor = `${resource}.${latest}.floor.json`;
  // Announce the high-water revision first: a concurrent read must never fall back.
  await publishImmutableJson(path.join(directory, floor), { revision: latest });
  const intent = `${resource}.${latest}.intent.json`;
  return removeReplicaFiles(
    directory,
    files
      .filter(({ name }) => name !== floor && name !== intent)
      .reverse()
      .map(({ name }) => name),
  );
}

export async function removeReplicaFiles(
  directory: string,
  names: readonly string[],
): Promise<RemovedRevisions> {
  const result = { removed_files: 0, removed_bytes: 0 };
  for (const name of names) {
    const filename = path.join(directory, name);
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
  if (result.removed_files) await syncDirectory(directory);
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
