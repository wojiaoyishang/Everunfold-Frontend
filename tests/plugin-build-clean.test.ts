import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { promisify } from "node:util";

test("standalone plugin builds prepare generated contracts before loading the registry", async () => {
  const source = process.cwd();
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-plugin-clean-"));
  try {
    for (const name of [
      "src/core",
      "src/sdk",
      "src/plugins/book",
      "tools",
      "package.json",
      "contracts.lock.json",
      "tsconfig.json",
      ".prettierrc.json",
    ]) {
      await cp(path.join(source, name), path.join(root, name), {
        recursive: true,
      });
    }
    await symlink(
      path.join(source, "node_modules"),
      path.join(root, "node_modules"),
      "junction",
    );
    const contracts = path.join(root, "var/cache/contracts");
    await mkdir(contracts, { recursive: true });
    const lock = JSON.parse(
      await readFile(path.join(source, "contracts.lock.json"), "utf8"),
    );
    // Seed only pinned raw schemas for an offline test, never generated TS/JSON.
    for (const name of Object.keys(lock.contracts)) {
      await cp(
        path.join(source, "var/cache/contracts", name),
        path.join(contracts, name),
      );
    }
    await assert.rejects(readFile(path.join(contracts, "content-types.json")));
    await promisify(execFile)(
      "npm",
      ["run", "plugins:build", "--", "--plugin", "book", "--output", "plugins"],
      {
        cwd: root,
        env: {
          ...process.env,
          EVERUNFOLD_BACKEND_PATH: path.join(root, "no-backend"),
          npm_config_ignore_scripts: "true",
          npm_config_offline: "true",
        },
        timeout: 60_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    assert.ok(
      (await readFile(path.join(contracts, "content-types.json"))).length,
    );
    const manifest = JSON.parse(
      await readFile(path.join(root, "plugins/book/manifest.json"), "utf8"),
    );
    assert.equal(manifest.directory, "book");
    assert.equal(manifest.protocol, "plugin-package-1");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
