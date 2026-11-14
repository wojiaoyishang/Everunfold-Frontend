/** Isolated integration read using the same store as SSR. */
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import {
  contentDirectory,
  readConfigurationFiles,
} from "../../src/core/config/files";
import { FileContentStore } from "../../src/server/content/store";
if (process.env.NODE_ENV !== "test") throw new Error("Test fixture only");
const root = process.env.EVERUNFOLD_PROJECT_ROOT ?? process.cwd();
const { settings: config, connections } = readConfigurationFiles(root);
const store = new FileContentStore(
  path.resolve(root, contentDirectory(config, !!connections)),
  config.frontendNodeId,
  config.settings.sourceEpoch ?? "",
  config.cache.maxSnapshotBytes,
);
// An intent deliberately precedes its snapshot: readers fail closed during that
// window. Poll for the current release, never select an older public snapshot.
for (let attempt = 0; ; attempt++) {
  try {
    const value = await store.read();
    if (connections && !value)
      throw new Error("Configured source has no snapshot");
    console.log(JSON.stringify(value));
    break;
  } catch (error) {
    if (attempt >= 40 || (error as NodeJS.ErrnoException).code !== "ENOENT")
      throw error;
    await delay(50);
  }
}
