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

import { bindEnvironment, parseDeployment } from "./deployment";

export const profileId = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
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
    config.listener.host,
    config.listener.port,
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

export function readConfigSource(filename: string) {
  try {
    const source = fs.readFileSync(
      /* turbopackIgnore: true */ filename,
      "utf8",
    );
    if (Buffer.byteLength(source) > 1024 * 1024)
      throw new Error("file too large");
    return source;
  } catch {
    throw new ConfigurationError(`配置文件不可读：${filename}（CONFIG_FILE）`);
  }
}

export function readConfigurationFiles(
  root: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const selected = environment.CONFIG_FILE ?? "config.yaml";
  if (!selected.trim()) throw new ConfigurationError("CONFIG_FILE 不能为空");
  const main = path.resolve(root, selected);
  return parseConfigurationFile(
    root,
    main,
    readConfigSource(main),
    environment,
  );
}

export function parseConfigurationFile(
  root: string,
  main: string,
  source: string,
  environment: Record<string, string | undefined> = process.env,
) {
  const yaml = /\.ya?ml$/i.test(main);
  const deployment = yaml ? parseDeployment(source) : undefined;
  const file = {
    filename: main,
    format: yaml ? ("yaml" as const) : ("toml" as const),
    revision: createHash("sha256").update(source).digest("hex"),
  };
  if (!yaml && Buffer.byteLength(source) > maxConfigBytes)
    throw new ConfigurationError("配置文件过大");
  let input: Record<string, unknown>;
  try {
    input = deployment
      ? configObject(deployment.value.application, "application")
      : configObject(parse(source), "根配置");
  } catch {
    throw new ConfigurationError("应用配置格式无效");
  }
  const effective = { ...deployment?.environment, ...environment };
  if (deployment) {
    const data = path.resolve(
      root,
      effective.EVERUNFOLD_DATA_DIR ?? "var/instance",
    );
    for (const [section, directory] of [
      ["settings", "settings"],
      ["cache", "public-snapshots"],
    ]) {
      const values = configObject(input[section] ?? {}, section);
      input[section] = {
        ...values,
        directory: path.resolve(
          data,
          typeof values.directory === "string" ? values.directory : directory,
        ),
      };
    }
  }
  const parseSettings = (value: Record<string, unknown>) =>
    bindEnvironment(parseConfiguration(value, effective), effective);
  const connection = input.backend_node_file;
  const embedded = deployment?.value.connection_profiles;
  if (connection === undefined && embedded === undefined) {
    return {
      settings: parseSettings(input),
      connections: undefined,
      file,
    };
  }
  const mainSettings = configObject(input.settings ?? {}, "settings");
  if (
    "BACKEND_BASE_URL" in input ||
    "browser_loopback_origin" in input ||
    "backend" in input ||
    "source_epoch" in mainSettings ||
    environment.BACKEND_BASE_URL !== undefined
  ) {
    throw new ConfigurationError("独立连接文件和内联后端连接只能使用一种");
  }
  if (
    embedded === undefined &&
    (typeof connection !== "string" ||
      !connection.trim() ||
      connection.includes("\0"))
  )
    throw new ConfigurationError("backend_node_file 必须为有效文件路径");

  const filename =
    embedded !== undefined
      ? main
      : path.resolve(path.dirname(main), connection as string);
  const profileSource =
    embedded !== undefined ? source : readConfigSource(filename);
  const value =
    embedded !== undefined
      ? configObject(embedded, "connection_profiles")
      : configObject(parse(profileSource), "后端连接");
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
      [
        "FRONTEND_NODE_ID",
        "BACKEND_BASE_URL",
        "browser_loopback_origin",
        "source_epoch",
        "backend",
      ],
      "连接配置",
    );
    const settings = parseSettings({
      ...shared,
      FRONTEND_NODE_ID: profile.FRONTEND_NODE_ID ?? shared.FRONTEND_NODE_ID,
      BACKEND_BASE_URL: profile.BACKEND_BASE_URL,
      browser_loopback_origin: profile.browser_loopback_origin,
      backend: profile.backend,
      settings: { ...mainSettings, source_epoch: profile.source_epoch },
    });
    const internal = new URL(settings.backend.baseUrl);
    const publicUrl = new URL(settings.backendBaseUrl);
    if (
      !settings.settings.sourceEpoch ||
      publicUrl.pathname !== "/" ||
      internal.pathname !== "/" ||
      (!yaml && internal.protocol !== "https:" && !loopback(internal.hostname))
    )
      throw new ConfigurationError(
        "每个连接需要来源 UUID、公开根地址及 HTTP/HTTPS 内部根地址",
      );
    profiles.add(id);
    if (id === active) selectedSettings = settings;
  }
  if (!selectedSettings) throw new ConfigurationError("活动连接不存在");
  const revision = createHash("sha256").update(profileSource).digest("hex");
  const connections: BackendProfiles = { filename, active, revision, profiles };
  return { settings: selectedSettings, connections, file };
}
