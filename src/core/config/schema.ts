import { isIP } from "node:net";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export interface FrontendConfiguration {
  theme: { active: string };
  plugins: { directory: string };
  publicSiteUrl: string | undefined;
  backendBaseUrl: string;
  frontendNodeId: string;
  backend: {
    baseUrl: string;
    allowedPeerIps: string[];
    nextjsToFastapiTokenEnv: string | undefined;
    fastapiToNextjsTokenEnv: string | undefined;
    connectTimeoutSeconds: number;
    requestTimeoutSeconds: number;
  };
  settings: {
    directory: string;
    sourceEpoch: string | undefined;
    receiverHost: string;
    receiverPort: number;
  };
  cache: {
    directory: string;
    maxSnapshotBytes: number;
    maxConcurrentFetches: number;
    maxTotalBytes: number;
    minFreeBytes: number;
    rebuildConcurrency: number;
  };
}

function object(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigurationError(`${field} 必须为配置对象`);
  }
  return value as Record<string, unknown>;
}

function knownKeys(
  value: Record<string, unknown>,
  keys: string[],
  field: string,
): void {
  if (Object.keys(value).some((key) => !keys.includes(key))) {
    throw new ConfigurationError(`${field} 含有未声明的配置字段`);
  }
}

function string(value: unknown, field: string): string {
  if (typeof value !== "string" || !value.trim()) {
    throw new ConfigurationError(`${field} 必须为非空字符串`);
  }
  return value.trim();
}

function number(value: unknown, fallback: number, field: string): number {
  if (value === undefined) return fallback;
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) {
    throw new ConfigurationError(`${field} 必须为正整数`);
  }
  return value;
}

function baseUrl(value: unknown, field: string): string {
  const raw = string(value, field);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigurationError(`${field} 必须为绝对 HTTP/HTTPS 地址`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    /\/(?:api|v1)(?:\/|$)/i.test(url.pathname)
  ) {
    throw new ConfigurationError(
      `${field} 不能包含凭据、查询参数或 API 版本前缀`,
    );
  }
  return raw.replace(/\/+$/, "");
}

function tokenReference(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  const result = string(value, field);
  if (!/^[A-Z_][A-Z0-9_]*$/.test(result)) {
    throw new ConfigurationError(`${field} 必须引用环境变量名`);
  }
  return result;
}

function peerAddresses(value: unknown): string[] {
  if (value === undefined) return [];
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === "string")
  ) {
    throw new ConfigurationError(
      "backend.allowed_peer_ips 必须为 IP/CIDR 列表",
    );
  }
  for (const entry of value as string[]) {
    const [address, prefix, extra] = entry.split("/");
    const version = isIP(address);
    if (
      !version ||
      extra !== undefined ||
      (prefix !== undefined &&
        (!/^\d+$/.test(prefix) || Number(prefix) > (version === 4 ? 32 : 128)))
    )
      throw new ConfigurationError("backend.allowed_peer_ips 包含无效 IP/CIDR");
  }
  return value as string[];
}

export function parseConfiguration(
  input: unknown,
  environment: Record<string, string | undefined> = {},
): FrontendConfiguration {
  const root = object(input, "根配置");
  knownKeys(
    root,
    [
      "BACKEND_BASE_URL",
      "FRONTEND_NODE_ID",
      "PUBLIC_SITE_URL",
      "backend",
      "cache",
      "settings",
      "theme",
      "plugins",
    ],
    "根配置",
  );
  const plugins = object(root.plugins ?? {}, "plugins");
  knownKeys(plugins, ["directory"], "plugins");
  const pluginDirectory = string(
    environment.PLUGINS_DIRECTORY ?? plugins.directory ?? "./plugins",
    "plugins.directory",
  );
  const theme = object(root.theme ?? {}, "theme");
  knownKeys(theme, ["active"], "theme");
  const activeTheme = string(
    environment.FRONTEND_THEME ?? theme.active ?? "argon",
    "theme.active",
  );
  if (!/^[a-z][a-z0-9-]*$/.test(activeTheme))
    throw new ConfigurationError("theme.active 必须为已安装主题的ID");
  const backend = object(root.backend ?? {}, "backend");
  const cache = object(root.cache ?? {}, "cache");
  const settings = object(root.settings ?? {}, "settings");
  knownKeys(
    settings,
    ["directory", "source_epoch", "receiver_host", "receiver_port"],
    "settings",
  );
  const sourceEpoch =
    settings.source_epoch === undefined
      ? undefined
      : string(settings.source_epoch, "settings.source_epoch");
  if (
    sourceEpoch &&
    !/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(sourceEpoch)
  )
    throw new ConfigurationError("settings.source_epoch 必须为后端来源 UUID");
  const receiverHost = string(
    settings.receiver_host ?? "127.0.0.1",
    "settings.receiver_host",
  );
  if (!isIP(receiverHost))
    throw new ConfigurationError("settings.receiver_host 必须为监听 IP");
  const receiverPort = number(
    settings.receiver_port,
    3001,
    "settings.receiver_port",
  );
  if (receiverPort > 65535)
    throw new ConfigurationError("settings.receiver_port 不合法");
  knownKeys(
    backend,
    [
      "base_url",
      "allowed_peer_ips",
      "nextjs_to_fastapi_token_env",
      "fastapi_to_nextjs_token_env",
      "connect_timeout_seconds",
      "request_timeout_seconds",
    ],
    "backend",
  );
  knownKeys(
    cache,
    [
      "directory",
      "max_snapshot_bytes",
      "max_concurrent_fetches",
      "max_total_bytes",
      "min_free_bytes",
      "rebuild_concurrency",
    ],
    "cache",
  );
  const publicUrl = baseUrl(
    environment.BACKEND_BASE_URL ?? root.BACKEND_BASE_URL,
    "BACKEND_BASE_URL",
  );
  const nodeId = string(
    environment.FRONTEND_NODE_ID ?? root.FRONTEND_NODE_ID,
    "FRONTEND_NODE_ID",
  );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(nodeId)) {
    throw new ConfigurationError("FRONTEND_NODE_ID 格式不正确");
  }
  const siteValue = environment.PUBLIC_SITE_URL ?? root.PUBLIC_SITE_URL;
  const publicSiteUrl =
    siteValue === undefined ? undefined : baseUrl(siteValue, "PUBLIC_SITE_URL");
  if (publicSiteUrl && new URL(publicSiteUrl).pathname !== "/")
    throw new ConfigurationError("PUBLIC_SITE_URL 必须为前台公开站点根地址");
  return {
    theme: { active: activeTheme },
    plugins: { directory: pluginDirectory },
    settings: {
      directory: string(
        settings.directory ?? "./var/settings",
        "settings.directory",
      ),
      sourceEpoch,
      receiverHost,
      receiverPort,
    },
    publicSiteUrl,
    backendBaseUrl: publicUrl,
    frontendNodeId: nodeId,
    backend: {
      baseUrl:
        backend.base_url === undefined
          ? publicUrl
          : baseUrl(backend.base_url, "backend.base_url"),
      allowedPeerIps: peerAddresses(backend.allowed_peer_ips),
      nextjsToFastapiTokenEnv: tokenReference(
        backend.nextjs_to_fastapi_token_env,
        "backend.nextjs_to_fastapi_token_env",
      ),
      fastapiToNextjsTokenEnv: tokenReference(
        backend.fastapi_to_nextjs_token_env,
        "backend.fastapi_to_nextjs_token_env",
      ),
      connectTimeoutSeconds: number(
        backend.connect_timeout_seconds,
        2,
        "backend.connect_timeout_seconds",
      ),
      requestTimeoutSeconds: number(
        backend.request_timeout_seconds,
        15,
        "backend.request_timeout_seconds",
      ),
    },
    cache: {
      directory: string(
        cache.directory ?? "./var/public-snapshots",
        "cache.directory",
      ),
      maxSnapshotBytes: number(
        cache.max_snapshot_bytes,
        8388608,
        "cache.max_snapshot_bytes",
      ),
      maxConcurrentFetches: number(
        cache.max_concurrent_fetches,
        4,
        "cache.max_concurrent_fetches",
      ),
      maxTotalBytes: number(
        cache.max_total_bytes,
        2147483648,
        "cache.max_total_bytes",
      ),
      minFreeBytes: number(
        cache.min_free_bytes,
        536870912,
        "cache.min_free_bytes",
      ),
      rebuildConcurrency: number(
        cache.rebuild_concurrency,
        2,
        "cache.rebuild_concurrency",
      ),
    },
  };
}
