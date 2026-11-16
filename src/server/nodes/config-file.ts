import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { lstat, open, readFile, rename, unlink } from "node:fs/promises";
import type { readConfiguration } from "@/core/config/server";

export class NodeConfigConflict extends Error {}
type Config = ReturnType<typeof readConfiguration>;

/** Same-directory atomic replacement. Revision checks protect against another browser or setup. */
export async function replaceConfiguration(
  filename: string,
  revision: string,
  prepare: (source: string) => Promise<string>,
) {
  if ((await lstat(filename)).isSymbolicLink())
    throw new NodeConfigConflict("请将 CONFIG_FILE 指向符号链接的实际目标");
  const lockName = filename + ".switch.lock";
  const lock = await open(lockName, "wx", 0o600).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "EEXIST") throw new NodeConfigConflict();
      throw error;
    },
  );
  const staging = filename + ".staging-" + randomBytes(8).toString("hex");
  const matches = (source: string) =>
    createHash("sha256").update(source).digest("hex") === revision;
  try {
    const before = await readFile(filename, "utf8");
    if (!matches(before)) throw new NodeConfigConflict();
    const contents = await prepare(before);
    if (contents === before) return;
    const output = await open(staging, "wx", 0o600);
    try {
      await output.writeFile(contents, "utf8");
      await output.sync();
    } finally {
      await output.close();
    }
    if (
      (await lstat(filename)).isSymbolicLink() ||
      !matches(await readFile(filename, "utf8"))
    )
      throw new NodeConfigConflict();
    await rename(staging, filename);
  } finally {
    await lock.close();
    await Promise.all([unlink(staging).catch(() => {}), unlink(lockName)]);
  }
}

export type AuthorizeConfiguration = (fresh: Config) => Promise<void>;
