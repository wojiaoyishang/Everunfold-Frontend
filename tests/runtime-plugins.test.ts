import test from "node:test";
import assert from "node:assert/strict";
import {
  mkdtemp,
  mkdir,
  writeFile,
  readFile,
  stat,
  cp,
  rm,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { tmpdir } from "node:os";
import { readInstalledPlugins } from "../src/server/plugins/packages";
import {
  installRuntimePlugins,
  runtimeStore,
} from "../src/core/plugins/runtime/store";
import { renderContent } from "../src/core/rendering/content";
import type { FrontendPlugin } from "../src/core/plugins/types";
import {
  isPluginEditingRoute,
  packageSetChanged,
} from "../src/core/plugins/runtime/update-policy";
import type { RuntimeCatalog } from "../src/core/plugins/runtime/types";
import { pluginRegistry } from "../src/core/plugins/registry";

const declaration = (title = "Runtime test") =>
  `export default { id:"test.runtime",title:${JSON.stringify(title)},version:"1.0.0",setup({pages,components}){ components.register("test.runtime.control");pages.register({registration:{id:"test.runtime",version:"1.0.0",title:"Runtime test",path:"/runtime-test"},component:"test.runtime.control",comments:{placement:"manual"}});}};`;
const control = `import {useState} from "react";import {Button,PageComments,usePageComments,usePageCommentClient,CaptchaField,readPageComments,submitReaderComment,useCaptcha,captchaFailure} from "@everunfold/plugin-sdk/client";import styles from "./control.module.css";import mark from "./mark.svg";export default {"test.runtime.control":function Control(){const [value,setValue]=useState(0);const page=usePageComments();const client=usePageCommentClient();return <><Button className={styles.control} onClick={()=>setValue(value+1)}><img alt="" src={mark}/>{value}</Button><PageComments/>{!page.preview&&<CaptchaField control={client.captcha}/>}</>;},"test.runtime.api":function Api(){return String([readPageComments,submitReaderComment,useCaptcha,captchaFailure].length)}};`;

test("independent packages load without source, preserve last good build, and disable without deleting declarations", async () => {
  const { buildPlugin } = await import("../tools/plugins/build.mjs");
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-plugin-test-"));
  const source = path.join(root, "src/plugins/runtime");
  const output = path.join(root, "plugins");
  const cache = path.join(root, "var/cache/packages");
  try {
    await mkdir(source, { recursive: true });
    await writeFile(
      path.join(root, "tsconfig.json"),
      JSON.stringify({ extends: path.resolve("tsconfig.json") }),
    );
    await writeFile(path.join(source, "plugin.ts"), declaration());
    await writeFile(path.join(source, "components.tsx"), control);
    await writeFile(
      path.join(source, "control.module.css"),
      ".control{color:var(--accent)}",
    );
    await writeFile(
      path.join(source, "mark.svg"),
      '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>',
    );
    await symlink(
      path.resolve("node_modules"),
      path.join(root, "node_modules"),
      "junction",
    );
    await writeFile(
      path.join(source, "pixel.png"),
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
        "base64",
      ),
    );
    await writeFile(
      path.join(source, "asset-types.tsx"),
      'import image from "./pixel.png"; const url:string=image; export const view=<img alt="" src={url}/>;',
    );
    const typeConfig = path.join(root, "asset-types.json");
    await writeFile(
      typeConfig,
      JSON.stringify({
        extends: path.resolve("tsconfig.plugins.json"),
        compilerOptions: {
          tsBuildInfoFile: path.join(root, "types.tsbuildinfo"),
        },
        include: [
          path.resolve("src/sdk/plugin-assets.d.ts"),
          path.join(source, "asset-types.tsx"),
        ],
        exclude: [],
      }),
    );
    await promisify(execFile)(process.execPath, [
      path.resolve("node_modules/typescript/bin/tsc"),
      "--noEmit",
      "-p",
      typeConfig,
    ]);
    const first = await buildPlugin(root, "runtime", {
      output,
      development: true,
    });
    const target = path.join(output, "runtime");
    const originalTime = (await stat(path.join(target, "manifest.json")))
      .mtimeMs;
    const again = await buildPlugin(root, "runtime", {
      output,
      development: true,
    });
    assert.equal(first.build, again.build);
    assert.equal(
      (await stat(path.join(target, "manifest.json"))).mtimeMs,
      originalTime,
    );
    const js = await readFile(
      path.join(target, first.entries.browser!),
      "utf8",
    );
    assert.match(js, /everunfold\.plugin-sdk\.1/);
    for (const name of [
      "PageComments",
      "usePageComments",
      "usePageCommentClient",
      "CaptchaField",
      "useCaptcha",
      "captchaFailure",
      "readPageComments",
      "submitReaderComment",
    ])
      assert.ok(js.includes(name), `Independent package bridges ${name}`);
    assert.match(js, /\/__plugins\/assets\/runtime\/asset\.[0-9a-f]{64}\.svg/);
    assert.match(js, /createSignatureFunctionForTransform/);
    assert.doesNotMatch(js, /node_modules\/react\/cjs/);
    assert.match(
      await readFile(path.join(target, first.entries.css!), "utf8"),
      /test_runtime.*control/,
    );
    let loaded = await readInstalledPlugins(output, cache);
    assert.equal(loaded.packages.length, 1);
    assert.deepEqual(loaded.errors, []);
    assert.equal(
      loaded.packages[0].manifest.pages[0].comments?.placement,
      "manual",
    );
    installRuntimePlugins(
      loaded.packages.map((p) => p.plugin),
      [],
      "runtime-test-active",
    );
    assert.equal(
      pluginRegistry.componentOwner("test.runtime.control"),
      "test.runtime",
    );
    installRuntimePlugins(
      loaded.packages.map((p) => p.plugin),
      ["test.runtime"],
      "runtime-test-disabled",
    );
    assert.equal(pluginRegistry.pages.length, 0);
    await writeFile(path.join(source, "plugin.ts"), "invalid syntax }}}");
    await assert.rejects(buildPlugin(root, "runtime", { output }));
    assert.equal(
      JSON.parse(await readFile(path.join(target, "manifest.json"), "utf8"))
        .build,
      first.build,
    );
    await writeFile(path.join(target, "manifest.json"), "{partial upload");
    loaded = await readInstalledPlugins(output, cache);
    assert.equal(loaded.packages[0].manifest.build, first.build);
    assert.equal(loaded.errors.length, 1);
    await writeFile(
      path.join(source, "plugin.ts"),
      declaration("Updated runtime"),
    );
    const next = await buildPlugin(root, "runtime", { output });
    await rm(path.join(root, "src"), { recursive: true });
    loaded = await readInstalledPlugins(output, cache);
    assert.equal(loaded.packages[0].manifest.build, next.build);
    assert.equal(loaded.packages[0].plugin.title, "Updated runtime");
    assert.equal(
      (await stat(path.join(cache, "runtime", first.entries.shared))).isFile(),
      true,
    );
    const cold = path.join(root, "cold");
    await cp(output, cold, { recursive: true });
    await writeFile(
      path.join(cold, "runtime", next.entries.shared),
      "tampered",
    );
    const rejected = await readInstalledPlugins(cold, cache);
    assert.equal(rejected.packages.length, 0);
    assert.equal(rejected.errors.length, 1);
    await rm(target, { recursive: true });
    assert.equal(
      (await readInstalledPlugins(output, cache)).packages.length,
      0,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("production editors defer replacements on actual page, new-content and embedded routes", () => {
  for (const path of [
    "/admin/pages/new",
    "/admin/pages/123",
    "/admin/pages/123/live",
    "/admin/content/article/new",
    "/admin/content/article/123/edit",
    "/admin/content/shuoshuo/123/live",
  ])
    assert.equal(isPluginEditingRoute(path), true, path);
  for (const path of [
    "/admin/pages",
    "/admin/pages/123/preview",
    "/admin/settings/plugins",
    "/admin/content/article",
    "/article.html",
  ])
    assert.equal(isPluginEditingRoute(path), false, path);
  const catalog = {
    plugins: [{ id: "p.test", build: "new" }],
    disabled: [],
  } as unknown as RuntimeCatalog;
  assert.equal(
    packageSetChanged(new Map([["p.test", { build: "old" }]]), catalog),
    true,
  );
  assert.equal(
    packageSetChanged(new Map([["p.test", { build: "new" }]]), catalog),
    false,
  );
  assert.equal(
    packageSetChanged(new Map([["p.test", { build: "new" }]]), {
      ...catalog,
      disabled: ["p.test"],
    }),
    true,
  );
});

test("late shortcode registration and disabling update the sanitizer's class allowlist", () => {
  const previous = { ...runtimeStore() };
  const plugin: FrontendPlugin = {
    id: "test.late-style",
    version: "1.0.0",
    setup({ shortcodes }) {
      shortcodes.register({
        definition: {
          id: "12345678-1234-4234-8234-123456789abc",
          name: "late-style",
          title: "Late style",
          description: "",
          kind: "leaf",
          revision: 1,
          scope: "ef-sc-12345678123442348234123456789abc",
          parameters: [],
          html: "",
          css: "",
        },
        classNames: ["late-shortcode-style"],
        render: () =>
          '<aside class="late-shortcode-style">Late content</aside>',
      });
    },
  };
  const render = (source: string) =>
    renderContent({
      id: "late-style-test",
      content: [{ id: "body", type: "html", content: source }],
      media_urls: {},
    }).html;
  try {
    installRuntimePlugins([plugin], [], "late-shortcode-active");
    assert.match(render("{{< late-style >}}"), /class="late-shortcode-style"/);
    installRuntimePlugins([plugin], [plugin.id], "late-shortcode-disabled");
    assert.doesNotMatch(
      render('<aside class="late-shortcode-style">Old content</aside>'),
      /class="late-shortcode-style"/,
    );
  } finally {
    Object.assign(runtimeStore(), previous);
  }
});
