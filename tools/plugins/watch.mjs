import { readdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { buildPlugin } from "./build.mjs";
import { writeArtifact } from "../write-artifact.mjs";

async function fingerprint(directory) {
  const hash = createHash("sha256");
  async function visit(folder) {
    for (const entry of (await readdir(folder, { withFileTypes: true })).sort(
      (a, b) => a.name.localeCompare(b.name),
    )) {
      if (entry.name.startsWith(".")) continue;
      const file = path.join(folder, entry.name);
      if (entry.isSymbolicLink())
        throw new Error("Plugin source symlinks are not supported");
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile()) {
        hash.update(path.relative(directory, file));
        hash.update(await readFile(file));
      }
    }
  }
  await visit(directory);
  return hash.digest("hex");
}
/** Polling also works on Docker bind mounts whose file events can be dropped. */
export async function watchPlugins(root, output) {
  const signatures = new Map(),
    errors = new Map();
  let stopped = false,
    timer;
  const cycle = async () => {
    const source = path.join(root, "src/plugins");
    const names = (await readdir(source, { withFileTypes: true }))
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
    for (const name of names) {
      try {
        const signature = await fingerprint(path.join(source, name));
        if (signature === signatures.get(name)) continue;
        signatures.set(name, signature);
        await buildPlugin(root, name, { output, development: true });
        errors.delete(name);
        console.log(`[plugins] ${name} ready`);
      } catch (error) {
        errors.set(
          name,
          error.errors?.map((e) => e.text).join("\n") ?? error.message,
        );
        console.error(
          `[plugins] ${name}: build failed; keeping last working package`,
        );
      }
    }
    for (const name of signatures.keys())
      if (!names.includes(name)) {
        signatures.delete(name);
        errors.delete(name);
        await rm(path.join(output, name), { recursive: true, force: true });
      }
    await writeArtifact(
      path.join(output, ".errors.json"),
      JSON.stringify(
        [...errors].map(([directory, message]) => ({ directory, message })),
      ),
    );
    if (!stopped) timer = setTimeout(() => void cycle(), 600);
  };
  await cycle();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
