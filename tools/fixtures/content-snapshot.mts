/** Isolated integration read using the same store as SSR. */
import fs from "node:fs";
import { setTimeout as delay } from "node:timers/promises";
import { parse } from "smol-toml";
import { parseConfiguration } from "../../src/core/config/schema";
import { FileContentStore } from "../../src/server/content/store";
if (process.env.NODE_ENV !== "test") throw new Error("Test fixture only");
const config = parseConfiguration(
  parse(fs.readFileSync(process.env.CONFIG_FILE!, "utf8")),
  process.env,
);
const store = new FileContentStore(
  config.cache.directory,
  config.frontendNodeId,
  config.settings.sourceEpoch!,
);
// An intent deliberately precedes its snapshot: readers fail closed during that
// window. Poll for the current release, never select an older public snapshot.
for (let attempt = 0; ; attempt++) {
  try {
    console.log(JSON.stringify(await store.read()));
    break;
  } catch (error) {
    if (attempt >= 40 || (error as NodeJS.ErrnoException).code !== "ENOENT")
      throw error;
    await delay(50);
  }
}
