/** Resolve the same CONFIG_FILE and listener as the running frontend. */
import path from "node:path";
import { pathToFileURL } from "node:url";

try {
  const { readConfigurationFiles } = await import(
    pathToFileURL(path.resolve("src/core/config/files.ts")).href
  );
  const { settings } = readConfigurationFiles(process.cwd());
  let { host, port } = settings.listener;
  host = { "0.0.0.0": "127.0.0.1", "::": "::1" }[host] ?? host;
  if (host.includes(":")) host = "[" + host + "]";
  const response = await fetch(`http://${host}:${port}/health/ready`, {
    signal: AbortSignal.timeout(4000),
    redirect: "error",
  });
  if (!response.ok) process.exitCode = 1;
  await response.body?.cancel();
} catch {
  process.exitCode = 1;
}
