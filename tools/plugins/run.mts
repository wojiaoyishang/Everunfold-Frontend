import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { watchInventory } from "./inventory.mts";
const root = fileURLToPath(new URL("../../", import.meta.url));
const dev = process.argv[2] === "dev";
if (!dev) process.env.NODE_ENV = "production";
const output = dev ? path.join(root, "var/cache/plugins") : undefined;
let stopCompile = () => {};
if (dev) {
  const [{ exportThemes }, { watchPlugins }] = await Promise.all([
    import("./theme-catalog.mts"),
    import("./watch.mjs"),
  ]);
  await exportThemes(root);
  stopCompile = await watchPlugins(root, output);
}
const stopInventory = watchInventory(root, output);
const next = spawn(
  process.execPath,
  [
    path.join(root, "node_modules/next/dist/bin/next"),
    dev ? "dev" : "start",
    "--hostname",
    "0.0.0.0",
    ...process.argv.slice(3),
  ],
  {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...(output ? { PLUGINS_DIRECTORY: output } : {}) },
  },
);
let ending = false;
function stop(signal: NodeJS.Signals = "SIGTERM") {
  if (ending) return;
  ending = true;
  stopCompile();
  stopInventory();
  next.kill(signal);
}
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => stop(signal));
next.on("error", () => {
  stop();
  process.exitCode = 1;
});
next.on("exit", (code) => {
  stopCompile();
  stopInventory();
  process.exitCode = code ?? 0;
});
