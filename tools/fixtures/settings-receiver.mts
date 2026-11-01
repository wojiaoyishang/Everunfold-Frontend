/** Fault-injection fixture. Not imported by the application or production receiver. */
import fs from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";
import { parseConfiguration } from "../../src/core/config/schema";
import { FileSettingsStore } from "../../src/server/settings/store";
import { FileContentStore } from "../../src/server/content/store";
import { settingsReceiver } from "../../src/server/settings/receiver";
if (process.env.NODE_ENV !== "test") throw new Error("Test fixture only");
const config = parseConfiguration(
  parse(fs.readFileSync(process.env.CONFIG_FILE!, "utf8")),
  process.env,
);
const store = new FileSettingsStore(
  path.resolve(config.settings.directory),
  config.frontendNodeId,
  config.settings.sourceEpoch!,
);
const delay = Number(process.env.TEST_ACK_DELAY_MS ?? "0");
const server = settingsReceiver(
  {
    read: (resource) => store.read(resource),
    apply: async (value) => {
      const result = await store.apply(value);
      if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
      return result;
    },
  },
  process.env.TEST_SETTINGS_TOKEN!,
  config.backend.allowedPeerIps,
  new FileContentStore(
    path.resolve(config.cache.directory),
    config.frontendNodeId,
    config.settings.sourceEpoch!,
    config.cache.maxSnapshotBytes,
  ),
);
server.listen(config.settings.receiverPort, config.settings.receiverHost);
