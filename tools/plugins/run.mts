import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { watchInventory } from "./inventory.mts";
import { configurationEnvironment } from "../../src/core/config/deployment";
import { readConfigurationFiles } from "../../src/core/config/files";
import { frontendWorkerCount, superviseFrontend } from "../frontend-cluster";
const root = fileURLToPath(new URL("../../", import.meta.url));
const project = process.env.EVERUNFOLD_PROJECT_ROOT ?? root;
const dev = process.argv[2] === "dev";
if (!dev) process.env.NODE_ENV = "production";
const output = dev ? path.join(root, "var/cache/plugins") : undefined;
const count = dev
  ? 1
  : frontendWorkerCount(
      configurationEnvironment(readConfigurationFiles(project).settings)
        .FRONTEND_WORKERS,
    );
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
const server = path.join(root, "tools/server.mts");
const args = [...(dev ? ["--dev"] : []), ...process.argv.slice(3)];
if (count > 1) {
  // The only periodic recovery loop lives next to the inventory watcher.
  const { configuredReplicaRecovery } =
    await import("../../src/server/settings/runtime");
  const recovery = configuredReplicaRecovery(project);
  superviseFrontend(root, server, args, count, recovery, (code) => {
    recovery.stop();
    stopInventory();
    process.exitCode = code;
  });
} else {
  const next = spawn(process.execPath, ["--import", "tsx", server, ...args], {
    cwd: root,
    stdio: "inherit",
    env: { ...process.env, ...(output ? { PLUGINS_DIRECTORY: output } : {}) },
  });
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
  next.on("exit", (code, signal) => {
    stopCompile();
    stopInventory();
    process.exitCode = code ?? (ending && signal ? 0 : 1);
  });
}
