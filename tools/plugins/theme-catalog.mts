import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import { discoverExtensions } from "../extensions/discovery";
import { collectThemes } from "../../src/core/extensions/component-descriptors";
import { writeArtifact } from "../write-artifact.mjs";
import type { ThemeDefinition } from "../../src/core/extensions/types";
export async function exportThemes(root: string) {
  const directories = await discoverExtensions(root, "themes");
  const definitions: ThemeDefinition[] = await Promise.all(
    directories.map(
      async (name) =>
        (
          await import(
            pathToFileURL(path.join(root, "src/themes", name, "theme.ts")).href
          )
        ).default,
    ),
  );
  const registry = collectThemes(definitions);
  const themes = registry.all.map((theme) => ({
    id: theme.id,
    title:
      theme.id === "argon"
        ? "Argon"
        : theme.id === "paper"
          ? "Paper"
          : theme.id,
    version: theme.version,
    parent: theme.parent ?? null,
  }));
  await writeArtifact(
    path.join(root, "var/cache/build/theme-catalog.json"),
    JSON.stringify(themes, null, 2) + "\n",
  );
  return themes;
}
if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  await exportThemes(fileURLToPath(new URL("../../", import.meta.url)));
