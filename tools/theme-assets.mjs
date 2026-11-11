import { cp, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const themes = path.join(root, "src", "themes");
const output = path.join(root, "public", "themes");

/** Theme assets have one source of truth under src/themes/<id>/assets. */
await mkdir(output, { recursive: true });
let copied = 0;
for (const entry of await readdir(themes, { withFileTypes: true })) {
  if (!entry.isDirectory() || !/^[a-z][a-z0-9-]*$/.test(entry.name)) continue;
  const source = path.join(themes, entry.name, "assets");
  const exists = await readdir(source, { withFileTypes: true }).catch(
    () => null,
  );
  if (!exists) continue;
  const target = path.join(output, entry.name);
  await rm(target, { recursive: true, force: true });
  await cp(source, target, { recursive: true, force: true });
  copied += 1;
}
console.log(`Prepared theme-owned assets for ${copied} themes.`);
