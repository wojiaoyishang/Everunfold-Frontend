import path from "node:path";
import {
  connectionIdentity,
  contentDirectory,
  readConfigurationFiles,
} from "../src/core/config/files";
import { FileSettingsStore } from "../src/server/settings/store";
import { settingsReceiver } from "../src/server/settings/receiver";
import { FileContentStore } from "../src/server/content/store";
const root = process.env.EVERUNFOLD_PROJECT_ROOT ?? process.cwd();
const { settings: config, connections } = readConfigurationFiles(root);
const identity = connectionIdentity(config);
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
  path.resolve(root, contentDirectory(config, !!connections)),
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
  () => {
    try {
      const current = readConfigurationFiles(root);
      return (
        !!current.connections === !!connections &&
        connectionIdentity(current.settings) === identity
      );
    } catch {
      return false;
    }
  },
);
server.listen(config.settings.receiverPort, config.settings.receiverHost, () =>
  console.log(`Content/settings receiver ready for ${config.frontendNodeId}`),
);
for (const signal of ["SIGINT", "SIGTERM"] as const)
  process.on(signal, () => server.close(() => process.exit(0)));
