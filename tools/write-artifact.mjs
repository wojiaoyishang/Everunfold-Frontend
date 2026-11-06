import { readFile, writeFile, mkdir, rename, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";

/** Preserve unchanged mtimes and publish complete files; checks must not repeatedly reload editors. */
export async function writeArtifact(target, content) {
  const file = target instanceof URL ? fileURLToPath(target) : target;
  if ((await readFile(file, "utf8").catch(() => null)) === content) return;
  await mkdir(path.dirname(file), { recursive: true });
  const staging = path.join(
    path.dirname(file),
    `.${path.basename(file)}.${randomUUID()}.tmp`,
  );
  try {
    await writeFile(staging, content);
    await rename(staging, file);
  } finally {
    await rm(staging, { force: true });
  }
}
