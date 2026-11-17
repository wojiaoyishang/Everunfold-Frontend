import { configurationEnvironment } from "../../core/config/deployment";
import path from "node:path";
import {
  connectionIdentity,
  contentDirectory,
  readConfigurationFiles,
} from "../../core/config/files";
import { FileSettingsStore } from "./store";
import { cacheMaintenance } from "./cache-maintenance";
import {
  settingsHandler,
  type RecoveryControl,
  type ReplicaWrite,
} from "./receiver";
import { replicaRecovery } from "./recovery";
import { FileContentStore } from "../content/store";

function configuredReplicas(root: string) {
  const { settings: config, connections } = readConfigurationFiles(root);
  const identity = connectionIdentity(config);
  if (!config.settings.sourceEpoch)
    throw new Error(
      "Configure settings.source_epoch before starting the receiver",
    );
  const token =
    configurationEnvironment(config)[
      config.backend.fastapiToNextjsTokenEnv ?? ""
    ] ?? "";
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
  function currentConfiguration() {
    const current = readConfigurationFiles(root);
    if (
      !!current.connections !== !!connections ||
      connectionIdentity(current.settings) !== identity ||
      (configurationEnvironment(current.settings)[
        current.settings.backend.fastapiToNextjsTokenEnv ?? ""
      ] ?? "") !== token
    )
      return;
    return current.settings;
  }
  const recovery = replicaRecovery({
    intervalSeconds: config.cache.recoveryIntervalSeconds,
    settings: store,
    content,
    backend: () => {
      const current = currentConfiguration();
      if (!current) return;
      return {
        nodeId: current.frontendNodeId,
        baseUrl: current.backend.baseUrl,
        token:
          configurationEnvironment(current)[
            current.backend.nextjsToFastapiTokenEnv ?? ""
          ] ?? "",
        timeoutMs: Math.min(current.backend.requestTimeoutSeconds, 30) * 1000,
      };
    },
  });
  return {
    config,
    store,
    content,
    target,
    token,
    currentConfiguration,
    recovery,
  };
}

export function configuredReplicaRecovery(root: string) {
  return configuredReplicas(root).recovery;
}

export function configuredSettingsRuntime(
  root: string,
  cluster?: {
    recovery: RecoveryControl & { visit: () => void };
    write: ReplicaWrite;
  },
) {
  const {
    config,
    store,
    content,
    target,
    token,
    currentConfiguration,
    recovery,
  } = configuredReplicas(root);
  const control = cluster?.recovery ?? recovery;
  const handler = settingsHandler(
    store,
    token,
    config.backend.allowedPeerIps,
    content,
    target,
    () => {
      try {
        return !!currentConfiguration();
      } catch {
        return false;
      }
    },
    cacheMaintenance(target, store, content),
    control,
    cluster?.write,
  );
  return {
    handler,
    visit: () => control.visit(),
    start: () => {
      if (!cluster) recovery.start();
    },
    stop: () => {
      if (!cluster) recovery.stop();
    },
  };
}
