/** Post-build installation and browser execution in a disposable production deployment. */
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, writeFile, readFile, rm } from "node:fs/promises";
import path from "node:path";
const execute = promisify(execFile);
export async function verifyRuntimePlugins({ base, workspace, projectRoot }) {
  const catalog = await (await fetch(base + "/__plugins/catalog")).json();
  assert.equal(catalog.errors.length, 0);
  assert.ok(
    catalog.plugins.some((plugin) => plugin.id === "verification.plugin"),
  );
  assert.ok(catalog.plugins.every((plugin) => !("node" in plugin.entries)));
  const pkg = catalog.plugins[0];
  assert.equal(
    (await fetch(base + `/__plugins/assets/${pkg.directory}/manifest.json`))
      .status,
    404,
  );
  assert.equal(
    (
      await fetch(
        base +
          `/__plugins/assets/${pkg.directory}/shared.${"0".repeat(64)}.cjs`,
      )
    ).status,
    404,
  );
  if (!process.env.PLAYWRIGHT_MODULE) {
    console.log(
      "Runtime package HTTP checks passed; set PLAYWRIGHT_MODULE and CHROMIUM_EXECUTABLE for post-build browser installation checks.",
    );
    return;
  }
  const require = createRequire(import.meta.url),
    playwright = require(process.env.PLAYWRIGHT_MODULE);
  const browser = await playwright.chromium.launch({
    executablePath: process.env.CHROMIUM_EXECUTABLE,
    args: ["--no-sandbox"],
  });
  const author = path.join(workspace, "var/cache/late-plugin-author"),
    source = path.join(author, "src/plugins/late");
  async function compile(label) {
    await mkdir(source, { recursive: true });
    await writeFile(
      path.join(author, "tsconfig.json"),
      JSON.stringify({ extends: path.join(workspace, "tsconfig.json") }),
    );
    await writeFile(
      path.join(source, "plugin.ts"),
      'export default {id:"verification.late",title:"Late plugin",version:"1.0.0",setup({components}){components.register("verification.late-control");}};',
    );
    await writeFile(
      path.join(source, "components.tsx"),
      `import {useState} from "react";import {Button} from "@everunfold/plugin-sdk/client";function Control(){const [count,setCount]=useState(0);return <Button data-late-plugin="true" onClick={()=>setCount(count+1)}>${label} {count}</Button>;}export default {"verification.late-control":Control};export function activate({onDispose}){window.__lateActivations=(window.__lateActivations??0)+1;onDispose(()=>window.__lateDisposals=(window.__lateDisposals??0)+1);}`,
    );
    const script = `const {buildPlugin}=await import("./tools/plugins/build.mjs");await buildPlugin(${JSON.stringify(author)},"late",{output:${JSON.stringify(path.join(workspace, "plugins"))}});`;
    await execute(
      process.execPath,
      ["--import", "tsx", "--input-type=module", "-e", script],
      { cwd: projectRoot },
    );
  }
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base + "/health/extension-verification");
    await page.locator('[data-extension-plugin="true"]').waitFor();
    await compile("Late");
    await page.getByRole("button", { name: "Late 0", exact: true }).waitFor();
    await page.getByRole("button", { name: "Late 0", exact: true }).click();
    await page.getByRole("button", { name: "Late 1", exact: true }).click();
    const installed = await (await fetch(base + "/__plugins/catalog")).json();
    const previous = installed.plugins.find(
      (p) => p.id === "verification.late",
    );
    // Exercise the editor-update guard without impersonating a logged-in editor.
    await page.evaluate(() => history.pushState({}, "", "/admin/pages/qa"));
    await compile("Updated late");
    await page
      .getByText("扩展已更新，重新打开编辑器后应用。当前编辑内容已保留。", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page.getByRole("button", { name: "Late 2", exact: true }).count(),
      1,
    );
    await page.evaluate(() =>
      history.pushState({}, "", "/health/extension-verification"),
    );
    await page
      .getByRole("button", { name: "Updated late 0", exact: true })
      .waitFor();
    assert.equal(
      (await fetch(base + `/__plugins/assets/late/${previous.entries.browser}`))
        .status,
      200,
    );
    assert.ok(await page.evaluate(() => window.__lateDisposals >= 1));
    const manifest = path.join(workspace, "plugins/late/manifest.json"),
      bytes = await readFile(manifest);
    await writeFile(manifest, "{partial-upload");
    const retained = await (await fetch(base + "/__plugins/catalog")).json();
    assert.ok(retained.plugins.some((p) => p.id === "verification.late"));
    assert.ok(retained.errors.length);
    assert.equal(
      await page
        .getByRole("button", { name: "Updated late 0", exact: true })
        .count(),
      1,
    );
    await writeFile(manifest, bytes);
    await rm(path.join(workspace, "plugins/late"), { recursive: true });
    await page
      .getByRole("button", { name: "Updated late 0", exact: true })
      .waitFor({ state: "detached" });
    assert.deepEqual(errors, []);
    console.log(
      "Production runtime plugins passed: no host plugin source, post-build install, shared React hooks, hot replacement, editor guard, retained assets, lifecycle disposal and partial-upload rollback.",
    );
  } finally {
    await browser.close();
    await rm(author, { recursive: true, force: true });
  }
}
