/** Build an isolated source copy without overwriting a running next dev's .next. */
import { spawn } from "node:child_process";
import { cp, mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const temporaryRoot = await realpath(tmpdir());
const workspace = await mkdtemp(path.join(temporaryRoot, "everunfold-build-"));
const modules = path.join(workspace, "node_modules");

try {
  for (const name of [
    "src",
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.ts",
  ]) {
    await cp(path.join(projectRoot, name), path.join(workspace, name), {
      recursive: true,
    });
  }
  await cp(
    path.join(projectRoot, "public/reference"),
    path.join(workspace, "public/reference"),
    {
      recursive: true,
    },
  );
  await cp(
    path.join(projectRoot, "public/favicon.ico"),
    path.join(workspace, "public/favicon.ico"),
  );
  // A real copy keeps Turbopack's filesystem boundary inside the temporary
  // project; a cross-drive Windows junction cannot provide that guarantee.
  await cp(path.join(projectRoot, "node_modules"), modules, {
    recursive: true,
    dereference: true,
  });
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [path.join(modules, "next/dist/bin/next"), "build"],
      {
        cwd: workspace,
        env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" },
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (status) => resolve(status ?? 1));
  });
  process.exitCode = Number(code);
} finally {
  // Only a verified tool-created tree is removed. All dependencies above are
  // copied with symlinks dereferenced; the running project's files stay intact.
  const target = await realpath(workspace);
  const relative = path.relative(temporaryRoot, target);
  if (
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    !path.basename(target).startsWith("everunfold-build-")
  ) {
    throw new Error("Refusing cleanup outside the temporary build workspace");
  }
  await rm(target, {
    recursive: true,
    force: true,
    maxRetries: 3,
    retryDelay: 500,
  });
}
