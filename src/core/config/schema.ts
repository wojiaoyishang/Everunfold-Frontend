import { isIP } from "node:net";

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigurationError";
  }
}

export interface FrontendConfiguration {
  listener: { host: string; port: number };
  theme: { active: string };
  plugins: { directory: string };
  publicSiteUrl: string | undefined;
  backendBaseUrl: string;
  browserLoopbackOrigin: string | undefined;
  frontendNodeId: string;
  nodesMonitor: {
    enabled: boolean;
    origin: string | undefined;
    passwordHash: string | undefined;
    sessionSecretEnv: string;
    trustedTlsProxyIps: string[];
  };
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
  };
  cache: {
    directory: string;
    maxSnapshotBytes: number;
    maxConcurrentFetches: number;
    maxTotalBytes: number;
    minFreeBytes: number;
    rebuildConcurrency: number;
    recoveryIntervalSeconds: number;
  };
}

export function configObject(
  value: unknown,
  field: string,
): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ConfigurationError(`${field} 必须为配置对象`);
  }
  return value as Record<string, unknown>;
}

export function configKeys(
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

export function baseUrl(value: unknown, field: string): string {
  const raw = string(value, field);
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ConfigurationError(`${field} 必须为绝对 HTTP/HTTPS 地址`);
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    /[\u0000-\u0020\u007f\\]/.test(raw) ||
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

export function loopback(hostname: string): boolean {
  return (
    hostname === "localhost" ||
    hostname === "[::1]" ||
    (isIP(hostname) === 4 && hostname.startsWith("127."))
  );
}

function monitorConfig(
  value: unknown,
  publicSiteUrl: string | undefined,
  dockerProxyIps: string | undefined,
): FrontendConfiguration["nodesMonitor"] {
  const monitor = configObject(value ?? {}, "nodes_monitor");
  configKeys(
    monitor,
    [
      "enabled",
      "origin",
      "password_hash",
      "session_secret_env",
      "trusted_tls_proxy_ips",
    ],
    "nodes_monitor",
  );
  const enabled = monitor.enabled ?? false;
  if (typeof enabled !== "boolean")
    throw new ConfigurationError("nodes_monitor.enabled 必须为布尔值");
  const published = publicSiteUrl ?? monitor.origin;
  const origin =
    published === undefined
      ? undefined
      : new URL(baseUrl(published, "nodes_monitor.origin"));
  if (
    enabled &&
    origin &&
    (origin.pathname !== "/" ||
      (origin.protocol !== "https:" && !loopback(origin.hostname)))
  )
    throw new ConfigurationError("节点诊断需要 HTTPS 或回环 HTTP 来源");
  if (enabled && !origin)
    throw new ConfigurationError("启用节点诊断需要配置 PUBLIC_SITE_URL");
  const hash = monitor.password_hash;
  if (
    hash !== undefined &&
    (typeof hash !== "string" ||
      !/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(hash))
  )
    throw new ConfigurationError("节点诊断密码必须使用生成工具生成哈希");
  const manual = monitor.trusted_tls_proxy_ips ?? [];
  if (!Array.isArray(manual))
    throw new ConfigurationError(
      "nodes_monitor.trusted_tls_proxy_ips 必须为 IP 列表",
    );
  const gateways =
    dockerProxyIps
      ?.split(",")
      .map((value) => value.trim())
      .filter(Boolean) ?? [];
  const trustedTlsProxyIps = [...new Set<unknown>([...manual, ...gateways])];
  if (
    !trustedTlsProxyIps.every(
      (address): address is string =>
        typeof address === "string" && isIP(address) !== 0,
    )
  )
    throw new ConfigurationError("节点诊断的 HTTPS 反代须使用单个 IP 地址");
  return {
    enabled,
    origin: origin?.origin,
    passwordHash: hash,
    trustedTlsProxyIps,
    sessionSecretEnv:
      tokenReference(
        monitor.session_secret_env,
        "nodes_monitor.session_secret_env",
      ) ?? "EVERUNFOLD_FRONTEND_NODES_SESSION_SECRET",
  };
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

function containerPeers(value: string | undefined): string[] {
  const peers = peerAddresses(
    value
      ?.split(",")
      .map((v) => v.trim())
      .filter(Boolean),
  );
  if (
    peers.some((peer) => peer.includes("/") && Number(peer.split("/")[1]) === 0)
  )
    throw new ConfigurationError(
      "EVERUNFOLD_INTERNAL_PEER_CIDRS 不允许全网范围",
    );
  return peers;
}

/** One socket for web pages, node diagnostics and authenticated internal sync. */
export function listenerConfiguration(
  environment: Record<string, string | undefined>,
) {
  const host = environment.FRONTEND_HOST ?? "0.0.0.0";
  const rawPort = environment.FRONTEND_PORT ?? "3000";
  if (!isIP(host)) throw new ConfigurationError("FRONTEND_HOST 必须为监听 IP");
  const port = Number(rawPort);
  if (!/^[0-9]{1,5}$/.test(rawPort) || port < 1 || port > 65535)
    throw new ConfigurationError("FRONTEND_PORT 必须为 1–65535 的十进制端口号");
  return { host, port };
}

export function parseConfiguration(
  input: unknown,
  environment: Record<string, string | undefined> = {},
): FrontendConfiguration {
  const root = configObject(input, "根配置");
  configKeys(
    root,
    [
      "BACKEND_BASE_URL",
      "browser_loopback_origin",
      "FRONTEND_NODE_ID",
      "PUBLIC_SITE_URL",
      "backend",
      "cache",
      "settings",
      "theme",
      "plugins",
      "nodes_monitor",
    ],
    "根配置",
  );
  const plugins = configObject(root.plugins ?? {}, "plugins");
  configKeys(plugins, ["directory"], "plugins");
  const pluginDirectory = string(
    environment.PLUGINS_DIRECTORY ?? plugins.directory ?? "./plugins",
    "plugins.directory",
  );
  const theme = configObject(root.theme ?? {}, "theme");
  configKeys(theme, ["active"], "theme");
  const activeTheme = string(
    environment.FRONTEND_THEME ?? theme.active ?? "argon",
    "theme.active",
  );
  if (!/^[a-z][a-z0-9-]*$/.test(activeTheme))
    throw new ConfigurationError("theme.active 必须为已安装主题的ID");
  const backend = configObject(root.backend ?? {}, "backend");
  const cache = configObject(root.cache ?? {}, "cache");
  const settings = configObject(root.settings ?? {}, "settings");
  configKeys(
    settings,
    // Accept old listener keys for migration only; they never open a second port.
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
  configKeys(
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
  configKeys(
    cache,
    [
      "directory",
      "max_snapshot_bytes",
      "max_concurrent_fetches",
      "max_total_bytes",
      "min_free_bytes",
      "rebuild_concurrency",
      "recovery_interval_seconds",
    ],
    "cache",
  );
  const publicUrl = baseUrl(
    environment.BACKEND_BASE_URL ?? root.BACKEND_BASE_URL,
    "BACKEND_BASE_URL",
  );
  const loopbackOrigin =
    root.browser_loopback_origin === undefined
      ? undefined
      : new URL(
          baseUrl(root.browser_loopback_origin, "browser_loopback_origin"),
        );
  if (
    loopbackOrigin &&
    (!loopback(loopbackOrigin.hostname) || loopbackOrigin.pathname !== "/")
  )
    throw new ConfigurationError("browser_loopback_origin 必须为回环根地址");
  const nodeId = string(
    environment.FRONTEND_NODE_ID ?? root.FRONTEND_NODE_ID,
    "FRONTEND_NODE_ID",
  );
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(nodeId)) {
    throw new ConfigurationError("FRONTEND_NODE_ID 格式不正确");
  }
  const siteValue = environment.PUBLIC_SITE_URL ?? root.PUBLIC_SITE_URL;
  const publicSiteUrl =
    siteValue === undefined ? undefined : baseUrl(siteValue, "PUBLIC_SITE_URL");
  if (publicSiteUrl && new URL(publicSiteUrl).pathname !== "/")
    throw new ConfigurationError("PUBLIC_SITE_URL 必须为前台公开站点根地址");
  const recoveryIntervalSeconds = number(
    cache.recovery_interval_seconds,
    60,
    "cache.recovery_interval_seconds",
  );
  if (recoveryIntervalSeconds > 86400)
    throw new ConfigurationError(
      "cache.recovery_interval_seconds 不能超过 86400",
    );
  return {
    listener: listenerConfiguration(environment),
    theme: { active: activeTheme },
    plugins: { directory: pluginDirectory },
    settings: {
      directory: string(
        settings.directory ?? "./var/settings",
        "settings.directory",
      ),
      sourceEpoch,
    },
    publicSiteUrl,
    backendBaseUrl: publicUrl,
    browserLoopbackOrigin: loopbackOrigin?.origin,
    frontendNodeId: nodeId,
    nodesMonitor: monitorConfig(
      root.nodes_monitor,
      publicSiteUrl,
      environment.EVERUNFOLD_NODES_TLS_PROXY_IPS,
    ),
    backend: {
      baseUrl:
        backend.base_url === undefined
          ? publicUrl
          : baseUrl(backend.base_url, "backend.base_url"),
      allowedPeerIps: [
        ...new Set([
          ...peerAddresses(backend.allowed_peer_ips),
          ...containerPeers(environment.EVERUNFOLD_INTERNAL_PEER_CIDRS),
        ]),
      ],
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
      recoveryIntervalSeconds,
    },
  };
}
