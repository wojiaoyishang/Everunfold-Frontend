/** Server diagnostics contain operation metadata, never credentials or payloads. */
import { runtimeLog } from "./runtime-log";
const reasons: Record<string, string> = {
  peer_not_allowed:
    "来源 IP 未获允许；核对 setup 中允许内部调用的 Docker 网络及手填来源",
  monitor_proxy_untrusted:
    "节点控制台的直连来源未获信任；核对 setup 中宿主机反代所在网络或手填代理 IP",
  monitor_peer_not_allowed: "节点控制台的直连来源不在允许列表",
  monitor_https_required: "节点控制台需要反代发送 X-Forwarded-Proto: https",
  token_missing:
    "缺少 Authorization；检查后端到前端的节点令牌及反向代理是否保留请求头",
  token_mismatch: "后端到前端的节点令牌不匹配；请重新导入同一节点的连接文件",
  receiver_restart_required:
    "节点连接配置已变化；请重新启动前端使接收器加载新配置",
  unknown_operation:
    "同步路径或 HTTP 方法不受支持；检查后端接收 URL 和代理转发路径",
  json_required: "同步请求必须使用 application/json",
  too_large: "同步请求超过接收大小限制；检查 cache.max_snapshot_bytes",
  cache_identity_mismatch: "缓存操作的节点 ID 或来源 UUID 与本机不一致",
  node_mismatch: "同步数据的节点 ID 与 FRONTEND_NODE_ID 不一致",
  source_epoch_mismatch:
    "同步数据的来源 UUID 与 settings.source_epoch 不一致；核对后端连接文件",
  settings_schema_invalid:
    "设置数据不符合锁定契约；核对前后端版本及同步资源格式",
  content_schema_invalid:
    "内容数据不符合锁定契约；核对前后端版本及同步资源格式",
  revision_mismatch: "同步版本与快照版本不一致",
  resource_not_applied: "同步数据未落盘，请结合 error_code/error_reason 排查",
  cache_state_unavailable: "无法读取本机缓存状态",
  cache_prune_unconfirmed: "缓存清理未能确认完成",
  cache_clear_unconfirmed: "清空缓存未能确认完成",
  public_data_not_synced:
    "当前节点没有已同步的可读公开内容；检查后端 Worker 的投递与前端同步接收日志",
  replica_unavailable: "无法读取本机公开副本",
  recovery_config_invalid: "无法读取前端恢复同步的运行配置",
  recovery_token_missing: "恢复同步缺少前端到后端的有效节点令牌",
  recovery_forbidden:
    "后端拒绝恢复同步；检查节点是否启用、实际来源 IP 和前端到后端令牌",
  recovery_invalid_response: "后端未确认恢复同步请求；检查两端版本与代理路径",
  backend_http: "后端内部请求返回失败状态；检查内部地址、代理与后端日志",
  backend_invalid: "后端健康响应格式不正确；检查内部地址是否指向 FastAPI",
  backend_network: "无法连接后端内部地址",
  inventory_config_invalid:
    "无法读取前端运行配置，请检查 CONFIG_FILE 和 /workspace 配置挂载",
  inventory_token_missing:
    "当前运行配置未读到前端到后端令牌；请核对 config_file、token_env 和 CONFIG_FILE 挂载，导入 Base64 后保存，并检查是否有空的外部环境变量覆盖",
  inventory_read_failed:
    "无法读取主题或插件清单；检查主体构建产物和 /data/plugins 挂载",
  inventory_forbidden:
    "后端拒绝扩展上报：检查 /_nodes 中该节点已启用、前端来源 IP/CIDR 已允许、前端到后端令牌一致",
  inventory_schema_invalid: "后端拒绝扩展清单格式；检查前后端契约及插件版本",
  inventory_too_large: "扩展清单超过后端大小限制",
  inventory_invalid_response:
    "后端未确认扩展注册；检查内部 URL 和代理是否返回了 HTML、重定向或其他服务的响应",
  frontend_unavailable: "前端处理内部同步时发生未捕获错误",
};

const systemReasons: Record<string, string> = {
  EACCES: "数据目录没有读写权限；检查 /data 挂载的 UID/GID",
  EPERM: "文件操作不允许；检查数据目录权限和挂载方式",
  EROFS: "数据目录为只读；/data 必须可写",
  ENOSPC: "数据目录磁盘空间不足",
  EDQUOT: "数据目录配额已用尽",
  ENOENT: "文件或目录不存在；检查构建产物和持久化挂载",
  EIO: "持久化存储读写失败",
  EXDEV: "原子文件发布跨越文件系统；检查数据目录挂载",
  ENOTFOUND: "后端域名无法解析；检查容器是否共享网络、别名是否正确",
  EAI_AGAIN: "DNS 解析暂时失败",
  ECONNREFUSED: "后端拒绝连接；检查内部端口、绑定地址和后端是否运行",
  ECONNRESET: "连接被对端重置",
  ENETUNREACH: "后端网络不可达",
  EHOSTUNREACH: "后端主机不可达",
  ETIMEDOUT: "连接或请求超时",
  UND_ERR_CONNECT_TIMEOUT: "连接后端超时",
  UND_ERR_HEADERS_TIMEOUT: "等待后端响应头超时",
  UND_ERR_BODY_TIMEOUT: "读取后端响应超时",
  CERT_HAS_EXPIRED: "后端 TLS 证书已过期",
  DEPTH_ZERO_SELF_SIGNED_CERT: "后端 TLS 证书为不受信任的自签名证书",
  UNABLE_TO_VERIFY_LEAF_SIGNATURE: "无法验证后端 TLS 证书链",
  ERR_TLS_CERT_ALTNAME_INVALID: "后端 TLS 证书与连接域名不匹配",
  TimeoutError: "请求超时",
  AbortError: "请求已中断",
  SyntaxError: "JSON 格式无效",
};

const storageReasons: Record<string, string> = {
  "Conflicting immutable revision":
    "同一不可变版本已有不同数据；核对来源 UUID 和副本目录",
  "Content source binding changed": "内容目录绑定了其他节点或来源 UUID",
  "Managed content is missing": "已登记的内容副本缺失",
  "Incomplete or conflicting content release": "内容副本不完整或哈希冲突",
  "Content release is too large": "内容副本超过配置大小限制",
  "Oversized settings revision": "设置副本超过大小限制",
  "Settings revision mismatch": "设置副本版本不一致",
  "Invalid content intent file": "内容发布标记文件无效",
  "Invalid or oversized public JSON file": "公开副本文件无效或过大",
  "Oversized public JSON file": "公开副本文件超过大小限制",
  "Invalid public snapshot contract": "公开内容快照不符合锁定契约",
  "Private reader data leaked into public snapshot":
    "公开快照混入用户私有数据，已拒绝同步",
  "Restricted content leaked into public snapshot":
    "公开快照混入受限内容，已拒绝同步",
  "Scheduled content is missing its opening time": "定时内容缺少开放时间",
  "Duplicate public content identity": "公开快照中的内容 ID 重复",
  "Invalid public content path": "公开内容路径无效",
  "Private page reader data leaked into public snapshot":
    "公开页面快照混入用户私有数据",
  "Restricted page leaked into public snapshot": "公开页面快照混入受限内容",
  "Invalid or duplicate managed page path": "页面路径无效或重复",
  "Comments refer to unavailable content": "评论引用了快照中不存在的内容",
  "Restricted comments leaked into public snapshot": "公开快照混入受限评论",
};

export class SyncValidationError extends Error {
  constructor(readonly code: string) {
    super(reasons[code]);
  }
}

export function syncErrorDetails(error: unknown): {
  error_code: string;
  error_reason: string;
} {
  if (error instanceof SyncValidationError)
    return { error_code: error.code, error_reason: reasons[error.code] };
  const pending: unknown[] = [error];
  for (let count = 0; pending.length && count < 12; count++) {
    const item = pending.shift();
    if (!item || typeof item !== "object") continue;
    const value = item as {
      code?: unknown;
      name?: unknown;
      cause?: unknown;
      errors?: unknown;
    };
    for (const key of [value.code, value.name]) {
      if (typeof key === "string" && Object.hasOwn(systemReasons, key))
        return { error_code: key, error_reason: systemReasons[key] };
    }
    if (item instanceof Error && Object.hasOwn(storageReasons, item.message))
      return {
        error_code: "storage_conflict",
        error_reason: storageReasons[item.message],
      };
    pending.push(value.cause);
    if (Array.isArray(value.errors)) pending.push(...value.errors.slice(0, 4));
  }
  return {
    error_code: "unknown",
    error_reason: "未分类错误；未输出可能含私密数据的异常正文",
  };
}

type SyncContext = {
  direction: "backend_to_frontend" | "frontend_to_backend" | "local";
  operation: string;
  node_id?: string;
  peer?: string;
  target?: string;
  status?: number;
  config_file?: string;
  token_env?: string;
};

export function syncFailure(
  context: SyncContext,
  code: string,
  error?: unknown,
) {
  const reason = reasons[code] ?? "同步失败";
  runtimeLog("error", "sync", reason, {
    ...context,
    code,
    reason,
    ...(error === undefined ? {} : syncErrorDetails(error)),
  });
}

export function syncTarget(url: string): string {
  const target = new URL(url);
  return target.origin + target.pathname;
}
