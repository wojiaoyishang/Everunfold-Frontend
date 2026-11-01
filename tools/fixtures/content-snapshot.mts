/** Isolated integration read using the same store as SSR. */
import fs from "node:fs";
import { parse } from "smol-toml";
import { parseConfiguration } from "../../src/core/config/schema";
import { FileContentStore } from "../../src/server/content/store";
if (process.env.NODE_ENV !== "test") throw new Error("Test fixture only");
const config = parseConfiguration(
  parse(fs.readFileSync(process.env.CONFIG_FILE!, "utf8")),
  process.env,
);
console.log(
  JSON.stringify(
    await new FileContentStore(
      config.cache.directory,
      config.frontendNodeId,
      config.settings.sourceEpoch!,
    ).read(),
  ),
);
