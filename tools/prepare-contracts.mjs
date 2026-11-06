import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const lock = JSON.parse(
  await readFile(new URL("../contracts.lock.json", import.meta.url), "utf8"),
);
for (const name of Object.keys(lock.contracts).sort()) {
  await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["tools/sync-contract.mjs", "--locked", name],
      { cwd: root, stdio: "inherit", windowsHide: true },
    );
    child.once("error", reject);
    child.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(new Error(`Contract preparation failed: ${name}`)),
    );
  });
}
