import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  cp,
  rm,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { readInstalledPlugins, sha256 } from "../src/server/plugins/packages";
import {
  parsePluginPackage,
  packageFontsMatch,
} from "../src/core/plugins/runtime/manifest";

test("registered plugin fonts package immutable files, survive source removal and reject escaped assets", async () => {
  const { buildPlugin } = await import("../tools/plugins/build.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-font-test-")),
    source = path.join(root, "src/plugins/fonts"),
    output = path.join(root, "plugins"),
    cache = path.join(root, "cache");
  try {
    await mkdir(path.join(source, "fonts"), { recursive: true });
    await writeFile(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ extends: path.resolve("tsconfig.json") }),
    );
    await symlink(
      path.resolve("node_modules"),
      path.join(root, "node_modules"),
      "junction",
    );
    await writeFile(
      path.join(source, "plugin.ts"),
      `import {definePlugin,defineFont} from "@everunfold/plugin-sdk";export default definePlugin({id:"test.fonts",version:"1.0.0",setup({fonts}){fonts.register(defineFont({id:"test.fonts.body",label:"Font",faces:[{src:"asset:fonts/body.woff2",format:"woff2"}]}));}});`,
    );
    const original = path.resolve(
      "node_modules/katex/dist/fonts/KaTeX_Main-Regular.woff2",
    );
    await cp(original, path.join(source, "fonts/body.woff2"));
    const first = await buildPlugin(root, "fonts", { output });
    const url = first.fonts?.[0].faces?.[0].src ?? "";
    assert.match(
      url,
      /^\/__plugins\/assets\/fonts\/asset\.[0-9a-f]{64}\.woff2$/,
    );
    const filename = path.basename(url),
      bytes = await readFile(path.join(output, "fonts", filename));
    assert.equal(sha256(bytes), first.assets[filename].sha256);
    assert.equal(bytes.toString("ascii", 0, 4), "wOF2");
    let loaded = await readInstalledPlugins(output, cache);
    assert.deepEqual(loaded.errors, []);
    assert.equal(loaded.packages.length, 1);
    assert.equal(packageFontsMatch([], first), false);
    await rm(path.join(source, "fonts/body.woff2"));
    await symlink(original, path.join(source, "fonts/body.woff2"));
    await assert.rejects(
      buildPlugin(root, "fonts", { output }),
      /Invalid plugin font asset/,
    );
    loaded = await readInstalledPlugins(output, cache);
    assert.equal(loaded.packages[0].manifest.build, first.build);
    const deployed = path.join(root, "deployed");
    await cp(output, deployed, { recursive: true });
    await rm(path.join(root, "src"), { recursive: true });
    const cold = await readInstalledPlugins(
      deployed,
      path.join(root, "cold-cache"),
    );
    assert.deepEqual(cold.errors, []);
    assert.equal(cold.packages[0].manifest.fonts?.[0].faces?.[0].src, url);
    const legacy = JSON.parse(JSON.stringify({ ...first, fonts: undefined }));
    assert.equal(
      Object.hasOwn(parsePluginPackage(legacy, "fonts"), "fonts"),
      false,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
