import path from "node:path";
import {
  connectionIdentity,
  contentDirectory,
  readConfigurationFiles,
} from "../../core/config/files";
import { FileSettingsStore } from "./store";
import { cacheMaintenance } from "./cache-maintenance";
import { settingsHandler } from "./receiver";
import { FileContentStore } from "../content/store";
export function configuredSettingsHandler(root: string) {
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
  const target = {
    node_id: config.frontendNodeId,
    source_epoch: config.settings.sourceEpoch,
  };
  return settingsHandler(
    store,
    token,
    config.backend.allowedPeerIps,
    content,
    target,
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
    cacheMaintenance(target, store, content),
  );
}
