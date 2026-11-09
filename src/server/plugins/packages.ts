/** Node-only package reader, also used by the independent deployment watcher. */
import { createHash, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import {
  readFile,
  readdir,
  mkdir,
  rename,
  writeFile,
  lstat,
  realpath,
} from "node:fs/promises";
import path from "node:path";
import {
  parsePluginPackage,
  packageFontsMatch,
} from "@/core/plugins/runtime/manifest";
import { createPluginRegistry } from "@/core/plugins/create-registry";
import type { FrontendPlugin } from "@/core/plugins/types";
import type {
  PluginPackage,
  PublicPluginPackage,
} from "@/core/plugins/runtime/types";

const nativeRequire = createRequire(import.meta.url);
const nativeModuleCache = Reflect.get(
  nativeRequire,
  "cache",
) as NodeJS.Dict<NodeModule>;
export const sha256 = (value: string | Uint8Array) =>
  createHash("sha256").update(value).digest("hex");
export interface AcceptedPlugin {
  manifest: PluginPackage;
  plugin: FrontendPlugin;
  files: ReadonlyMap<string, Uint8Array>;
}
interface ReaderState {
  accepted: Map<string, AcceptedPlugin>;
  signatures: Map<string, string>;
}
const roots = new Map<string, ReaderState>();

async function immutableFile(file: string, data: Uint8Array) {
  const existing = await readFile(file).catch(() => null);
  if (existing?.equals(data)) return;
  await mkdir(path.dirname(file), { recursive: true });
  const staging = `${file}.${randomUUID()}.tmp`;
  await writeFile(staging, data);
  await rename(staging, file);
}
async function localBytes(
  directory: string,
  name: string,
  maximum = 16 * 1024 * 1024,
) {
  const file = path.join(directory, name);
  const info = await lstat(file);
  if (!info.isFile() || info.size > maximum || (await realpath(file)) !== file)
    throw new Error("Invalid plugin file");
  return readFile(file);
}
export function publicPackage(manifest: PluginPackage): PublicPluginPackage {
  const { node, ...entries } = manifest.entries;
  void node;
  return { ...manifest, entries };
}
async function scanInstalledPlugins(directory: string, cacheDirectory: string) {
  directory = path.resolve(directory);
  let state = roots.get(directory);
  if (!state) {
    state = { accepted: new Map(), signatures: new Map() };
    roots.set(directory, state);
  }
  const errors: { directory: string; message: string }[] = [];
  const entries = await readdir(directory, { withFileTypes: true }).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    },
  );
  const present = new Set<string>();
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    if (entry.name.startsWith(".")) continue;
    present.add(entry.name);
    if (!entry.isDirectory() || !/^[a-z][a-z0-9-]*$/.test(entry.name)) {
      errors.push({ directory: entry.name, message: "插件目录无效" });
      continue;
    }
    const source = path.join(directory, entry.name);
    try {
      const raw = await localBytes(source, "manifest.json", 512 * 1024);
      const signature = sha256(raw);
      if (
        state.signatures.get(entry.name) === signature &&
        state.accepted.has(entry.name)
      )
        continue;
      const manifest = parsePluginPackage(
        JSON.parse(raw.toString()),
        entry.name,
      );
      if (process.env.NODE_ENV === "production" && manifest.development)
        throw new Error(
          "Development packages cannot be installed in production",
        );
      const { build, ...unsigned } = manifest;
      if (sha256(JSON.stringify(unsigned)) !== build)
        throw new Error("Plugin manifest digest mismatch");
      const files = new Map<string, Uint8Array>();
      for (const [name, expected] of Object.entries(manifest.assets)) {
        const bytes = await localBytes(source, name);
        if (
          bytes.length !== expected.bytes ||
          sha256(bytes) !== expected.sha256
        )
          throw new Error("Plugin asset digest mismatch");
        files.set(name, bytes);
        await immutableFile(
          path.resolve(cacheDirectory, entry.name, name),
          bytes,
        );
      }
      const node = await localBytes(source, manifest.entries.node);
      if (!manifest.entries.node.includes(sha256(node)))
        throw new Error("Plugin Node digest mismatch");
      // Execute only an immutable verified copy; copying a new release cannot alter old requests.
      const nodeFile = path.resolve(
        cacheDirectory,
        entry.name,
        manifest.entries.node,
      );
      await immutableFile(nodeFile, node);
      delete nativeModuleCache[nodeFile];
      const plugin = (
        nativeRequire(/* turbopackIgnore: true */ nodeFile) as {
          default: FrontendPlugin;
        }
      ).default;
      delete nativeModuleCache[nodeFile];
      const registry = createPluginRegistry([plugin], []);
      if (
        plugin.id !== manifest.id ||
        !packageFontsMatch(registry.fonts, manifest) ||
        JSON.stringify(registry.componentNames) !==
          JSON.stringify(manifest.components) ||
        JSON.stringify(
          registry.pages.map(({ pluginId, ...page }) => {
            void pluginId;
            return page;
          }),
        ) !== JSON.stringify(manifest.pages) ||
        JSON.stringify(registry.shortcodes.map((item) => item.definition)) !==
          JSON.stringify(manifest.shortcodes.map((item) => item.definition))
      )
        throw new Error("Plugin declaration mismatch");
      const candidate = { manifest, plugin, files };
      const proposed = [...state.accepted]
        .filter(([name]) => name !== entry.name)
        .map(([, item]) => item.plugin);
      createPluginRegistry([...proposed, plugin], []);
      state.accepted.set(entry.name, candidate);
      state.signatures.set(entry.name, signature);
    } catch (error) {
      void error;
      errors.push({
        directory: entry.name,
        message: state.accepted.has(entry.name)
          ? "更新未完成或校验失败，继续使用上次可用构建"
          : "插件包尚未就绪或不兼容",
      });
    }
  }
  for (const name of state.accepted.keys())
    if (!present.has(name)) {
      state.accepted.delete(name);
      state.signatures.delete(name);
    }
  return { packages: [...state.accepted.values()], errors };
}

const reading = new Map<
  string,
  Promise<Awaited<ReturnType<typeof scanInstalledPlugins>>>
>();
/** Coalesce overlapping scans so an earlier request cannot publish over a newer accepted set. */
export function readInstalledPlugins(
  directory: string,
  cacheDirectory: string,
) {
  const key = path.resolve(directory);
  const previous = reading.get(key);
  if (previous) return previous;
  const pending = scanInstalledPlugins(key, cacheDirectory).finally(() => {
    reading.delete(key);
  });
  reading.set(key, pending);
  return pending;
}
