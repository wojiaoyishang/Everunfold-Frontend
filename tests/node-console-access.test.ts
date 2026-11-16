import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import test from "node:test";

test("local node recovery works independently of backend health and reports unwritable storage", async () => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/fixtures/node-console-access.mjs",
    ],
    { cwd: process.cwd(), timeout: 30000 },
  );
  assert.match(stdout, /local recovery checks passed/);
});

test("browser connection editing persists in the selected YAML and a separate receiver reloads it", async () => {
  const { stdout } = await promisify(execFile)(
    process.execPath,
    [
      "--conditions=react-server",
      "--import",
      "tsx",
      "tests/fixtures/node-connections.mjs",
    ],
    { cwd: process.cwd(), timeout: 30000 },
  );
  assert.match(
    stdout,
    /browser connection editing and independent receiver checks passed/,
  );
});
