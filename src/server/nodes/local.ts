import { configurationEnvironment } from "@/core/config/deployment";
import "server-only";
import { createHash } from "node:crypto";
import { parse, stringify } from "smol-toml";
import { connectionIdentity } from "@/core/config/files";
import { readConfiguration } from "@/core/config/server";
import { configObject } from "@/core/config/schema";
import type { LocalNode } from "@/core/nodes/local";
import type { ReceiverStatus } from "@/core/contracts/settings";
import { FileContentStore } from "@/server/content/store";
import { FileSettingsStore } from "@/server/settings/store";
import { readReplicas } from "@/server/settings/receiver";
import { proofChallenge } from "./access";
import { activateYamlProfile } from "./connections";
import { NodeConfigConflict, replaceConfiguration } from "./config-file";
export { NodeConfigConflict } from "./config-file";

type Config = ReturnType<typeof readConfiguration>;

export function localRevision(config: Config): string {
  return config.file.format === "yaml"
    ? config.file.revision
    : (config.connections?.revision ??
        createHash("sha256").update(connectionIdentity(config)).digest("hex"));
}

export async function inspectNode(config: Config): Promise<LocalNode> {
  const { frontendNodeId, settings, cache, connections } = config;
  const epoch = settings.sourceEpoch;
  const revision = localRevision(config);
  const node: LocalNode = {
    nodeId: frontendNodeId,
    active: connections?.active ?? "inline",
    revision,
    profiles: [...(connections?.profiles ?? [])].map((profile) => ({
      id: profile,
      challenge: proofChallenge(config, { profile, revision }),
    })),
    receiver: "not_configured",
  };
  if (!epoch) return node;
  const store = new FileSettingsStore(
    settings.directory,
    frontendNodeId,
    epoch,
  );
  const content = new FileContentStore(
    cache.directory,
    frontendNodeId,
    epoch,
    cache.maxSnapshotBytes,
  );
  const [replicas, status] = await Promise.all([
    readReplicas(store, content),
    probeLocalReceiver(config),
  ]);
  return { ...node, replicas, ...status };
}

async function probeLocalReceiver(
  config: Config,
): Promise<Pick<LocalNode, "receiver" | "syncCheck">> {
  const token =
    configurationEnvironment(config)[
      config.backend.fastapiToNextjsTokenEnv ?? ""
    ] ?? "";
  if (token.length < 32) return { receiver: "not_configured" };
  const configuredHost = config.listener.host;
  const host = configuredHost.startsWith("127.")
    ? configuredHost
    : configuredHost === "0.0.0.0"
      ? "127.0.0.1"
      : configuredHost === "::" || configuredHost === "::1"
        ? "[::1]"
        : null;
  if (!host) return { receiver: "not_configured" };
  try {
    const response = await fetch(
      `http://${host}:${config.listener.port}/internal/settings/status`,
      {
        headers: { Authorization: "Bearer " + token },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(1200),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return { receiver: response.status === 403 ? "rejected" : "unavailable" };
    }
    const report = (await response.json()) as ReceiverStatus;
    return report.protocol === "node-status-1" &&
      report.node_id === config.frontendNodeId &&
      report.source_epoch === config.settings.sourceEpoch
      ? { receiver: "reachable", syncCheck: report.sync_check ?? undefined }
      : { receiver: "unavailable" };
  } catch {
    return { receiver: "unavailable" };
  }
}

export async function activateProfile(
  config: Config,
  profile: string,
  authorize: (fresh: Config) => Promise<void>,
) {
  const connections = config.connections;
  if (!connections || !connections.profiles.has(profile))
    throw new NodeConfigConflict();
  if (
    config.file.format === "yaml" &&
    connections.filename === config.file.filename
  )
    return activateYamlProfile(config, profile, authorize);
  const { filename, revision } = connections;
  await replaceConfiguration(filename, revision, async (before) => {
    const current = readConfiguration();
    if (
      current.connections?.filename !== filename ||
      current.connections.revision !== revision ||
      current.nodesMonitor.origin !== config.nodesMonitor.origin ||
      connectionIdentity(current) !== connectionIdentity(config)
    )
      throw new NodeConfigConflict();
    await authorize(current);
    if (profile === current.connections.active) return before;
    const parsed = configObject(parse(before), "后端连接");
    return stringify({ ...parsed, active: profile });
  });
}
