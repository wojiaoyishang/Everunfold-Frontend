import "server-only";
import { randomBytes } from "node:crypto";
import {
  configurationEnvironment,
  parseDeployment,
} from "@/core/config/deployment";
import {
  parseConfigurationFile,
  profileId,
  readConfigSource,
} from "@/core/config/files";
import { projectRoot, readConfiguration } from "@/core/config/server";
import {
  ConfigurationError,
  configObject,
  baseUrl,
  loopback,
} from "@/core/config/schema";
import type { ConnectionDraft, ConnectionList } from "@/core/nodes/local";
import {
  NodeConfigConflict,
  replaceConfiguration,
  type AuthorizeConfiguration,
} from "./config-file";

type Config = ReturnType<typeof readConfiguration>;

function connectionDocument(
  config: Config,
  source = readConfigSource(config.file.filename),
) {
  if (config.file.format !== "yaml")
    throw new ConfigurationError(
      "浏览器编辑需要部署 YAML；请用 setup 保存，并将 CONFIG_FILE 指向该文件",
    );
  const parsed = parseDeployment(source);
  const application = configObject(parsed.value.application, "application");
  const embedded = parsed.value.connection_profiles;
  if (application.backend_node_file && !embedded)
    throw new ConfigurationError("请先用 setup 将旧连接清单保存到部署 YAML");
  const settings = configObject(application.settings ?? {}, "settings");
  const connections =
    embedded === undefined
      ? {
          active: "main",
          profiles: {
            main: {
              FRONTEND_NODE_ID: application.FRONTEND_NODE_ID,
              BACKEND_BASE_URL: application.BACKEND_BASE_URL,
              ...(application.browser_loopback_origin
                ? {
                    browser_loopback_origin:
                      application.browser_loopback_origin,
                  }
                : {}),
              source_epoch: settings.source_epoch,
              backend: application.backend ?? {},
            },
          },
        }
      : configObject(embedded, "connection_profiles");
  return {
    ...parsed,
    application,
    settings,
    connections,
    profiles: configObject(connections.profiles, "profiles"),
  };
}

export function listConnections(config: Config): ConnectionList {
  const result: ConnectionList = {
    filename: config.file.filename,
    revision: config.file.revision,
    active: config.connections?.active ?? "main",
    editable: config.file.format === "yaml",
    profiles: [],
  };
  if (!result.editable) return result;
  const { profiles, application } = connectionDocument(config);
  const environment = configurationEnvironment(config);
  result.profiles = Object.entries(profiles).map(([id, raw]) => {
    const value = configObject(raw, "连接");
    const backend = configObject(value.backend ?? {}, "backend");
    return {
      id,
      nodeId: String(
        value.FRONTEND_NODE_ID ?? application.FRONTEND_NODE_ID ?? "",
      ),
      publicUrl: String(value.BACKEND_BASE_URL ?? ""),
      internalUrl: String(backend.base_url ?? value.BACKEND_BASE_URL ?? ""),
      sourceEpoch: String(value.source_epoch ?? ""),
      allowedPeerIps: (backend.allowed_peer_ips ?? []) as string[],
      hasInboundToken:
        !!environment[String(backend.nextjs_to_fastapi_token_env ?? "")],
      hasOutboundToken:
        !!environment[String(backend.fastapi_to_nextjs_token_env ?? "")],
    };
  });
  return result;
}

function readDraft(input: unknown): ConnectionDraft {
  const draft = configObject(input, "连接");
  const stringFields = [
    "id",
    "nodeId",
    "publicUrl",
    "internalUrl",
    "sourceEpoch",
    "inboundToken",
    "outboundToken",
  ];
  if (
    stringFields.some(
      (key) =>
        typeof draft[key] !== "string" || (draft[key] as string).length > 4096,
    ) ||
    !Array.isArray(draft.allowedPeerIps) ||
    draft.allowedPeerIps.length > 64 ||
    draft.allowedPeerIps.some(
      (value) => typeof value !== "string" || value.length > 128,
    )
  )
    throw new ConfigurationError("连接字段格式无效");
  if (!profileId.test(draft.id as string))
    throw new ConfigurationError(
      "连接名称只支持字母、数字、下划线和短横线，最多 64 字符",
    );
  const published = new URL(baseUrl(draft.publicUrl, "后端发布 URL"));
  if (published.protocol !== "https:" && !loopback(published.hostname))
    throw new ConfigurationError("后端发布 URL 必须使用 HTTPS 或回环 HTTP");
  return draft as unknown as ConnectionDraft;
}

export async function saveConnection(
  config: Config,
  input: unknown,
  revision: unknown,
  create: boolean,
  authorize: AuthorizeConfiguration,
) {
  if (revision !== config.file.revision) throw new NodeConfigConflict();
  const draft = readDraft(input);
  if (
    process.env.BACKEND_BASE_URL !== undefined ||
    process.env.FRONTEND_NODE_ID !== undefined
  )
    throw new ConfigurationError(
      "连接被进程环境变量覆盖；请移除 BACKEND_BASE_URL / FRONTEND_NODE_ID 的外部覆盖后重启，再保存",
    );
  await replaceConfiguration(
    config.file.filename,
    config.file.revision,
    async (source) => {
      const fresh = readConfiguration();
      if (
        fresh.file.filename !== config.file.filename ||
        fresh.file.revision !== config.file.revision
      )
        throw new NodeConfigConflict();
      await authorize(fresh);
      const state = connectionDocument(fresh, source);
      const exists = Object.hasOwn(state.profiles, draft.id);
      if ((create && exists) || (!create && !exists))
        throw new NodeConfigConflict();
      if (create && Object.keys(state.profiles).length >= 16)
        throw new ConfigurationError("最多保存 16 个后端连接");
      const old = exists ? configObject(state.profiles[draft.id], "连接") : {};
      const backend = configObject(old.backend ?? {}, "backend");
      const environment = configurationEnvironment(fresh);
      const inbound =
        draft.inboundToken ||
        environment[String(backend.nextjs_to_fastapi_token_env ?? "")] ||
        "";
      const outbound =
        draft.outboundToken ||
        environment[String(backend.fastapi_to_nextjs_token_env ?? "")] ||
        "";
      if (
        ![inbound, outbound].every((token) => /^[!-~]{32,4096}$/.test(token)) ||
        inbound === outbound
      )
        throw new ConfigurationError(
          "两个方向的令牌须分别填写至少 32 个可见 ASCII 字符，且不能相同；已有令牌留空保留",
        );
      const prefix =
        "EVERUNFOLD_NODE_" + randomBytes(8).toString("hex").toUpperCase();
      const nextjs = prefix + "_INBOUND",
        fastapi = prefix + "_OUTBOUND";
      state.environment[nextjs] = inbound;
      state.environment[fastapi] = outbound;
      state.profiles[draft.id] = {
        ...old,
        FRONTEND_NODE_ID: draft.nodeId,
        BACKEND_BASE_URL: draft.publicUrl,
        source_epoch: draft.sourceEpoch,
        backend: {
          ...backend,
          base_url: draft.internalUrl || draft.publicUrl,
          allowed_peer_ips: draft.allowedPeerIps,
          nextjs_to_fastapi_token_env: nextjs,
          fastapi_to_nextjs_token_env: fastapi,
        },
      };
      // Keep other connections' credentials, remove replaced references only if unshared.
      const used = new Set(
        Object.values(state.profiles).flatMap((raw) => {
          const item = configObject(
            configObject(raw, "连接").backend ?? {},
            "backend",
          );
          return [
            item.nextjs_to_fastapi_token_env,
            item.fastapi_to_nextjs_token_env,
          ];
        }),
      );
      for (const name of [
        backend.nextjs_to_fastapi_token_env,
        backend.fastapi_to_nextjs_token_env,
      ])
        if (typeof name === "string" && !used.has(name))
          delete state.environment[name];
      delete state.environment.BACKEND_BASE_URL;
      delete state.environment.FRONTEND_NODE_ID;
      for (const key of [
        "BACKEND_BASE_URL",
        "browser_loopback_origin",
        "backend",
        "backend_node_file",
      ])
        delete state.application[key];
      delete state.settings.source_epoch;
      state.application.settings = state.settings;
      state.document.set("application", state.application);
      state.document.set("environment", state.environment);
      state.document.set("connection_profiles", {
        active: draft.id,
        profiles: state.profiles,
      });
      const output = state.document.toString();
      parseConfigurationFile(projectRoot(), config.file.filename, output);
      return output;
    },
  );
  return { ok: true, filename: config.file.filename, restartRequired: true };
}

export async function activateYamlProfile(
  config: Config,
  profile: string,
  authorize: AuthorizeConfiguration,
) {
  await replaceConfiguration(
    config.file.filename,
    config.file.revision,
    async (source) => {
      const fresh = readConfiguration();
      if (
        fresh.file.filename !== config.file.filename ||
        fresh.file.revision !== config.file.revision
      )
        throw new NodeConfigConflict();
      await authorize(fresh);
      const state = connectionDocument(fresh, source);
      if (!Object.hasOwn(state.profiles, profile))
        throw new NodeConfigConflict();
      state.document.setIn(["connection_profiles", "active"], profile);
      const output = state.document.toString();
      parseConfigurationFile(projectRoot(), config.file.filename, output);
      return output;
    },
  );
}
