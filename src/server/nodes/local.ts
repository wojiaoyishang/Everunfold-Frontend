import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { open, readFile, rename, unlink } from "node:fs/promises";
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

type Config = ReturnType<typeof readConfiguration>;

export function localRevision(config: Config): string {
  return (
    config.connections?.revision ??
    createHash("sha256").update(connectionIdentity(config)).digest("hex")
  );
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
  const [replicas, receiver] = await Promise.all([
    readReplicas(store, content),
    probeLocalReceiver(config),
  ]);
  return { ...node, replicas, receiver };
}

async function probeLocalReceiver(
  config: Config,
): Promise<LocalNode["receiver"]> {
  const token = process.env[config.backend.fastapiToNextjsTokenEnv ?? ""] ?? "";
  if (token.length < 32) return "not_configured";
  const configuredHost = config.settings.receiverHost;
  const host = configuredHost.startsWith("127.")
    ? configuredHost
    : configuredHost === "0.0.0.0"
      ? "127.0.0.1"
      : configuredHost === "::" || configuredHost === "::1"
        ? "[::1]"
        : null;
  if (!host) return "not_configured";
  try {
    const response = await fetch(
      `http://${host}:${config.settings.receiverPort}/internal/settings/status`,
      {
        headers: { Authorization: "Bearer " + token },
        redirect: "error",
        cache: "no-store",
        signal: AbortSignal.timeout(1200),
      },
    );
    if (!response.ok) {
      await response.body?.cancel();
      return response.status === 403 ? "rejected" : "unavailable";
    }
    const report = (await response.json()) as ReceiverStatus;
    return report.protocol === "node-status-1" &&
      report.node_id === config.frontendNodeId &&
      report.source_epoch === config.settings.sourceEpoch
      ? "reachable"
      : "unavailable";
  } catch {
    return "unavailable";
  }
}

export class NodeConfigConflict extends Error {}

export async function activateProfile(
  config: Config,
  profile: string,
  authorize: (fresh: Config) => Promise<void>,
) {
  const connections = config.connections;
  if (!connections || !connections.profiles.has(profile))
    throw new NodeConfigConflict();
  const { filename } = connections;
  const lockName = filename + ".switch.lock";
  const lock = await open(lockName, "wx", 0o600).catch(
    (error: NodeJS.ErrnoException) => {
      if (error.code === "EEXIST") throw new NodeConfigConflict();
      throw error;
    },
  );
  const staging = filename + ".staging-" + randomBytes(8).toString("hex");
  try {
    const current = readConfiguration();
    if (
      current.connections?.filename !== filename ||
      current.connections.revision !== connections.revision ||
      current.nodesMonitor.origin !== config.nodesMonitor.origin ||
      connectionIdentity(current) !== connectionIdentity(config)
    )
      throw new NodeConfigConflict();
    await authorize(current);
    const before = await readFile(filename, "utf8");
    if (
      createHash("sha256").update(before).digest("hex") !== connections.revision
    )
      throw new NodeConfigConflict();
    if (profile === current.connections.active) return;
    const parsed = configObject(parse(before), "后端连接");
    const contents = stringify({ ...parsed, active: profile });
    const output = await open(staging, "wx", 0o600);
    try {
      await output.writeFile(contents, "utf8");
      await output.sync();
    } finally {
      await output.close();
    }
    await rename(staging, filename);
  } finally {
    await lock.close();
    await Promise.all([unlink(staging).catch(() => {}), unlink(lockName)]);
  }
}
