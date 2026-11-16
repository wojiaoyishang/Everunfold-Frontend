import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { createServer } from "node:http";
import { once } from "node:events";
import type { AddressInfo } from "node:net";
import { promisify } from "node:util";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { configurationEnvironment } from "../src/core/config/deployment";
import { readConfigurationFiles } from "../src/core/config/files";

const application = {
  BACKEND_BASE_URL: "https://api.example.test",
  FRONTEND_NODE_ID: "web-main",
  backend: {
    base_url: "http://everunfold-backend:8001",
    allowed_peer_ips: ["127.0.0.1"],
  },
};

test("CONFIG_FILE defaults only to project-root YAML, supports absolute and relative overrides, keeps secrets private", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-yaml-"));
  try {
    const source = JSON.stringify({
      version: 1,
      component: "frontend",
      application,
      environment: { FRONTEND_PORT: "3210", PRIVATE_VALUE: "do-not-serialize" },
    });
    await writeFile(
      path.join(root, "config.toml"),
      'BACKEND_BASE_URL = "https://legacy.example.test"\nFRONTEND_NODE_ID = "legacy"',
    );
    assert.throws(() => readConfigurationFiles(root, {}), /CONFIG_FILE/);
    await writeFile(path.join(root, "config.yaml"), source);
    const { settings, file } = readConfigurationFiles(root, {});
    assert.equal(file.filename, path.join(root, "config.yaml"));
    assert.equal(settings.listener.port, 3210);
    assert.equal(
      settings.settings.directory,
      path.join(root, "var/instance/settings"),
    );
    assert.equal(
      configurationEnvironment(settings).PRIVATE_VALUE,
      "do-not-serialize",
    );
    assert.ok(!JSON.stringify(settings).includes("do-not-serialize"));
    await mkdir(path.join(root, "private"));
    const selected = path.join(root, "private", "selected.yml");
    await writeFile(selected, source);
    for (const name of [selected, "private/selected.yml"]) {
      const config = readConfigurationFiles(root, {
        CONFIG_FILE: name,
        FRONTEND_PORT: "3220",
        EVERUNFOLD_DATA_DIR: "/data",
      });
      assert.equal(config.file.filename, selected);
      assert.equal(config.settings.listener.port, 3220);
      assert.equal(config.settings.cache.directory, "/data/public-snapshots");
    }
    for (const name of ["", " ", "missing.yaml"])
      assert.throws(() => readConfigurationFiles(root, { CONFIG_FILE: name }));
    assert.equal(
      readConfigurationFiles(root, { CONFIG_FILE: "config.toml" }).settings
        .frontendNodeId,
      "legacy",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("invalid YAML and aliases fail without source or credential disclosure", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-yaml-invalid-"));
  try {
    for (const source of [
      "version: 1\nversion: 2\nsecret: do-not-leak",
      "&loop [*loop]",
      "version: 1\ncomponent: backend\napplication: {}",
      JSON.stringify({
        version: 1,
        component: "frontend",
        application,
        environment: { TOKEN: 123 },
      }),
    ]) {
      await writeFile(path.join(root, "config.yaml"), source);
      assert.throws(
        () => readConfigurationFiles(root, {}),
        (error: Error) => !error.message.includes("do-not-leak"),
      );
    }
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("frontend startup tolerates backend HTTP failure while explicit checks fail and report only the internal URL", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "everunfold-check-"));
  const server = createServer((request, response) => {
    request.resume();
    response.writeHead(403);
    response.end("PRIVATE_RESPONSE");
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const internal = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const filename = path.join(root, "selected.yaml");
    await writeFile(
      filename,
      JSON.stringify({
        version: 1,
        component: "frontend",
        application: {
          ...application,
          backend: {
            ...application.backend,
            base_url: internal,
            nextjs_to_fastapi_token_env: "CHECK_INBOUND",
            fastapi_to_nextjs_token_env: "CHECK_OUTBOUND",
          },
          settings: { source_epoch: "00000000-0000-0000-0000-000000000001" },
        },
        environment: {
          CHECK_INBOUND: "synthetic_inbound_".repeat(3),
          CHECK_OUTBOUND: "synthetic_outbound_".repeat(3),
        },
      }),
    );
    const options = {
      cwd: process.cwd(),
      env: { ...process.env, CONFIG_FILE: filename },
      timeout: 15000,
    };
    const args = ["--import", "tsx", "deploy/check.mjs"];
    const result = await promisify(execFile)(process.execPath, args, options);
    assert.match(result.stdout, new RegExp(internal));
    assert.match(result.stderr, /HTTP 403/);
    assert.match(result.stderr, /前端仍会启动/);
    assert.ok(!(result.stdout + result.stderr).includes("PRIVATE_RESPONSE"));
    await assert.rejects(
      promisify(execFile)(
        process.execPath,
        [...args, "--require-backend"],
        options,
      ),
      (error: Error & { code?: number; stderr?: string }) =>
        error.code === 1 && !!error.stderr?.includes("HTTP 403"),
    );
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await rm(root, { recursive: true, force: true });
  }
});
