/** Explicit local deployment: pipe reviewed declarations to the backend's installer. */
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import path from "node:path";
import { readExtensionCatalog } from "./extensions/catalog";

const root = fileURLToPath(new URL("../", import.meta.url));
const { values } = parseArgs({
  options: {
    backend: { type: "string", default: "../Everunfold-Backend" },
    config: { type: "string", default: "config.toml" },
    "node-id": { type: "string" },
    python: { type: "string" },
  },
});
if (!values["node-id"])
  throw new Error(
    "Usage: npm run pages:register -- --node-id NODE [--backend PATH] [--config PATH] [--python PATH]",
  );
const backend = path.resolve(root, values.backend!);
const python =
  values.python ??
  path.join(
    backend,
    ".venv",
    process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
  );
const { manifest } = await readExtensionCatalog(root);
await new Promise<void>((resolve, reject) => {
  const child = spawn(
    python,
    [
      "-m",
      "tools.register_frontend_pages",
      "--config",
      values.config!,
      "--node-id",
      values["node-id"]!,
      "--manifest",
      "-",
    ],
    { cwd: backend, stdio: ["pipe", "inherit", "inherit"], windowsHide: true },
  );
  child.once("error", reject);
  child.stdin.on("error", reject);
  child.once("exit", (code) =>
    code === 0 ? resolve() : reject(new Error("Page registration failed.")),
  );
  child.stdin.end(JSON.stringify(manifest));
});
