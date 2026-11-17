/** Run in the deployed host's working directory, also via stdin in Docker. */
import {
  copyFile,
  lstat,
  mkdir,
  mkdtemp,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

async function publish(dataDirectory) {
  const data = await realpath(dataDirectory);
  const inbox = path.join(data, "plugin-inbox");
  const installed = path.join(data, "plugins");
  await mkdir(inbox, { recursive: true });
  await mkdir(installed, { recursive: true });
  if (
    (await realpath(inbox)) !== inbox ||
    (await realpath(installed)) !== installed
  )
    throw new Error("插件目录不能是符号链接。");
  const require = createRequire(path.resolve("package.json"));
  const { readInstalledPlugins } = require("./src/server/plugins/packages.ts");
  const {
    createPluginRegistry,
  } = require("./src/core/plugins/create-registry.ts");
  const work = await mkdtemp(path.join(data, ".plugin-publish-"));
  try {
    const cache = path.join(work, "verified");
    const pending = await readInstalledPlugins(inbox, cache);
    if (pending.errors.length)
      throw new Error(
        "待发布插件校验失败。\n" +
          pending.errors
            .map(({ directory, message }) => `${directory}：${message}`)
            .join("\n"),
      );
    if (!pending.packages.length)
      throw new Error(
        `待发布目录为空。请先编译插件，或将预编译包解压到 ${inbox}。`,
      );

    const current = await readInstalledPlugins(
      installed,
      path.join(work, "current"),
    );
    const replaced = new Set(
      pending.packages.map(({ manifest }) => manifest.directory),
    );
    createPluginRegistry(
      [
        ...current.packages.filter(
          ({ manifest }) => !replaced.has(manifest.directory),
        ),
        ...pending.packages,
      ].map(({ plugin }) => plugin),
      [],
    );
    const builds = new Map(
      current.packages.map(({ manifest }) => [
        manifest.directory,
        manifest.build,
      ]),
    );
    const updates = [];
    for (const { manifest, files } of pending.packages) {
      if (builds.get(manifest.directory) === manifest.build) continue;
      const target = path.join(installed, manifest.directory);
      const existing = await lstat(target).catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
      if (existing && !existing.isDirectory())
        throw new Error(`已安装插件的目录无效：${manifest.directory}`);
      const staging = path.join(work, "packages", manifest.directory);
      await mkdir(staging, { recursive: true });
      const node = manifest.entries.node;
      await copyFile(
        path.join(cache, manifest.directory, node),
        path.join(staging, node),
      );
      for (const [name, bytes] of files)
        await writeFile(path.join(staging, name), bytes);
      await writeFile(
        path.join(staging, "manifest.json"),
        JSON.stringify(manifest, null, 2) + "\n",
      );
      updates.push({
        staging,
        target,
        existing,
        assets: [node, ...files.keys()],
      });
    }
    // Keep previous hashed assets so already-open pages can finish using them.
    for (const { staging, target, existing, assets } of updates)
      if (existing)
        for (const asset of assets)
          await rename(path.join(staging, asset), path.join(target, asset));
    for (const { staging, target, existing } of updates) {
      if (existing)
        await rename(
          path.join(staging, "manifest.json"),
          path.join(target, "manifest.json"),
        );
      else await rename(staging, target);
    }
    console.log(
      updates.length
        ? `已热更新 ${updates.length} 个前端插件。浏览器将在下次插件检查时获取更新。`
        : "待发布的插件版本均已安装。",
    );
  } finally {
    await rm(work, { force: true, recursive: true });
  }
}

process.env.NODE_ENV = "production";
try {
  await publish(process.argv[2]);
} catch (error) {
  console.error(`前端插件发布失败：${error.message}`);
  process.exitCode = 1;
}
