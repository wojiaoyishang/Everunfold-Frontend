/** Cross-process immutable publication. Staging files never participate in reads. */
import { createHash, randomUUID } from "node:crypto";
import { mkdir, open, readFile, link, unlink } from "node:fs/promises";
import path from "node:path";

export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
export const jsonDigest = (value: unknown) =>
  createHash("sha256").update(canonical(value)).digest("hex");

export async function publishImmutableJson(target: string, value: unknown) {
  const directory = path.dirname(target);
  await mkdir(directory, { recursive: true });
  const staging = path.join(directory, `.staging-${randomUUID()}`);
  const bytes = canonical(value);
  try {
    const file = await open(staging, "wx", 0o600);
    try {
      await file.writeFile(bytes, "utf8");
      await file.sync();
    } finally {
      await file.close();
    }
    try {
      await link(staging, target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      if (canonical(JSON.parse(await readFile(target, "utf8"))) !== bytes)
        throw new Error("Conflicting immutable revision");
    }
    if (process.platform !== "win32") {
      const dir = await open(directory, "r");
      try {
        await dir.sync();
      } finally {
        await dir.close();
      }
    }
  } finally {
    await unlink(staging).catch(() => {});
  }
}
