/** Shared loader for Next.js, the receiver and the inventory reporter. */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { parse } from "smol-toml";
import {
  ConfigurationError,
  configKeys,
  configObject,
  loopback,
  parseConfiguration,
  type FrontendConfiguration,
} from "./schema";

const profileId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
const maxConfigBytes = 128 * 1024;

export interface BackendProfiles {
  filename: string;
  active: string;
  revision: string;
  profiles: Set<string>;
}

export function connectionIdentity(config: FrontendConfiguration): string {
  return JSON.stringify([
    config.frontendNodeId,
    config.backendBaseUrl,
    config.backend,
    config.settings.sourceEpoch,
    config.settings.directory,
    config.cache.directory,
    config.cache.maxSnapshotBytes,
    config.settings.receiverHost,
    config.settings.receiverPort,
  ]);
}

export function contentDirectory(
  config: FrontendConfiguration,
  profiled: boolean,
) {
  const epoch = config.settings.sourceEpoch;
  return profiled && epoch
    ? path.join(config.cache.directory, "sources", epoch)
    : config.cache.directory;
}

function readToml(filename: string) {
  try {
    const source = fs.readFileSync(
      /* turbopackIgnore: true */ filename,
      "utf8",
    );
    if (Buffer.byteLength(source) > maxConfigBytes)
      throw new Error("file too large");
    return { source, value: configObject(parse(source), "根配置") };
  } catch {
    throw new ConfigurationError("实例配置缺失或 TOML 格式无效");
  }
}

export function readConfigurationFiles(
  root: string,
  environment: NodeJS.ProcessEnv = process.env,
) {
  const selected = environment.CONFIG_FILE ?? "config.toml";
  if (!selected.trim()) throw new ConfigurationError("CONFIG_FILE 不能为空");
  const main = path.resolve(root, selected);
  const { value: input } = readToml(main);
  const connection = input.backend_node_file;
  if (connection === undefined) {
    return {
      settings: parseConfiguration(input, environment),
      connections: undefined,
    };
  }
  const mainSettings = configObject(input.settings ?? {}, "settings");
  if (
    "BACKEND_BASE_URL" in input ||
    "backend" in input ||
    "source_epoch" in mainSettings ||
    environment.BACKEND_BASE_URL !== undefined
  ) {
    throw new ConfigurationError("独立连接文件和内联后端连接只能使用一种");
  }
  if (
    typeof connection !== "string" ||
    !connection.trim() ||
    connection.includes("\0")
  )
    throw new ConfigurationError("backend_node_file 必须为有效文件路径");

  const filename = path.resolve(path.dirname(main), connection);
  const { value, source } = readToml(filename);
  configKeys(value, ["active", "profiles"], "后端连接");
  const active = value.active;
  const rawProfiles = configObject(value.profiles, "profiles");
  if (
    typeof active !== "string" ||
    !profileId.test(active) ||
    !Object.hasOwn(rawProfiles, active) ||
    Object.keys(rawProfiles).length > 16
  )
    throw new ConfigurationError("后端连接清单或活动连接无效");

  const shared = { ...input };
  delete shared.backend_node_file;
  const profiles = new Set<string>();
  let selectedSettings: FrontendConfiguration | undefined;
  for (const [id, raw] of Object.entries(rawProfiles)) {
    if (!profileId.test(id)) throw new ConfigurationError("后端连接 ID 不合法");
    const profile = configObject(raw, "连接配置");
    configKeys(
      profile,
      ["BACKEND_BASE_URL", "source_epoch", "backend"],
      "连接配置",
    );
    const settings = parseConfiguration(
      {
        ...shared,
        BACKEND_BASE_URL: profile.BACKEND_BASE_URL,
        backend: profile.backend,
        settings: { ...mainSettings, source_epoch: profile.source_epoch },
      },
      environment,
    );
    const internal = new URL(settings.backend.baseUrl);
    const publicUrl = new URL(settings.backendBaseUrl);
    if (
      !settings.settings.sourceEpoch ||
      publicUrl.pathname !== "/" ||
      internal.pathname !== "/" ||
      (internal.protocol !== "https:" && !loopback(internal.hostname))
    )
      throw new ConfigurationError(
        "每个连接需要来源 UUID、公开根地址及 HTTPS 或回环 HTTP 内部地址",
      );
    profiles.add(id);
    if (id === active) selectedSettings = settings;
  }
  if (!selectedSettings) throw new ConfigurationError("活动连接不存在");
  const revision = createHash("sha256").update(source).digest("hex");
  const connections: BackendProfiles = { filename, active, revision, profiles };
  return { settings: selectedSettings, connections };
}
