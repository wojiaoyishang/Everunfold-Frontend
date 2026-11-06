import { readdir, lstat } from "node:fs/promises";
import path from "node:path";

/** Only immediate, source-controlled package directories may contribute code. */
export async function discoverExtensions(
  root: string,
  kind: "themes" | "plugins",
) {
  const directory = path.join(root, "src", kind);
  const entries = await readdir(directory, { withFileTypes: true });
  const names: string[] = [];
  for (const entry of entries.sort((a, b) =>
    a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
  )) {
    if (entry.isSymbolicLink())
      throw new Error(`Extension symlinks are not supported: ${entry.name}`);
    if (!entry.isDirectory()) continue;
    if (!/^[a-z][a-z0-9-]*$/.test(entry.name))
      throw new Error(`Invalid extension directory: ${entry.name}`);
    for (const file of [kind === "themes" ? "theme.ts" : "plugin.ts"]) {
      const target = path.join(directory, entry.name, file);
      const info = await lstat(target).catch(() => null);
      if (!info?.isFile())
        throw new Error(`Missing extension entry: ${target}`);
    }
    names.push(entry.name);
  }
  return names;
}
