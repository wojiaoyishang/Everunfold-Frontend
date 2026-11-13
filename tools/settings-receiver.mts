import fs from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";
import { parseConfiguration } from "../src/core/config/schema";
import { FileSettingsStore } from "../src/server/settings/store";
import { settingsReceiver } from "../src/server/settings/receiver";
import { FileContentStore } from "../src/server/content/store";
const root = process.env.EVERUNFOLD_PROJECT_ROOT ?? process.cwd();
const config = parseConfiguration(
  parse(
    fs.readFileSync(
      path.resolve(root, process.env.CONFIG_FILE ?? "config.toml"),
      "utf8",
    ),
  ),
  process.env,
);
if (!config.settings.sourceEpoch)
  throw new Error(
    "Configure settings.source_epoch before starting the receiver",
  );
const token = process.env[config.backend.fastapiToNextjsTokenEnv ?? ""] ?? "";
const store = new FileSettingsStore(
  path.resolve(root, config.settings.directory),
  config.frontendNodeId,
  config.settings.sourceEpoch,
);
const content = new FileContentStore(
  path.resolve(root, config.cache.directory),
  config.frontendNodeId,
  config.settings.sourceEpoch,
  config.cache.maxSnapshotBytes,
);
const server = settingsReceiver(
  store,
  token,
  config.backend.allowedPeerIps,
  content,
  { node_id: config.frontendNodeId, source_epoch: config.settings.sourceEpoch },
);
server.listen(config.settings.receiverPort, config.settings.receiverHost, () =>
  console.log(`Content/settings receiver ready for ${config.frontendNodeId}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
