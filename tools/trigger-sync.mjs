/** Ask the configured backend to enqueue a new sync for the active frontend. */
import { createRequire } from "node:module";
import path from "node:path";

async function accepted(response, nodeId) {
  const reader = response.body?.getReader();
  if (!reader) return false;
  try {
    const chunks = [];
    let size = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      size += part.value.length;
      if (size > 8192) return false;
      chunks.push(part.value);
    }
    const value = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    return (
      value?.success === true &&
      value?.code === 200 &&
      value?.data?.node_id === nodeId &&
      value?.data?.queued === true
    );
  } finally {
    await reader.cancel();
  }
}

function failure(detail) {
  console.error("触发同步失败。" + detail);
  process.exitCode = 1;
}

async function main() {
  let detail = "请检查活动后端连接、节点令牌及运行依赖。";
  try {
    // Resolve from the runtime workspace for both mounted files and piped input.
    const loadConfiguration = createRequire(import.meta.url);
    const { readConfigurationFiles } = loadConfiguration(
      path.resolve("src/core/config/files.ts"),
    );
    const { configurationEnvironment } = loadConfiguration(
      path.resolve("src/core/config/deployment.ts"),
    );
    const { settings } = readConfigurationFiles(process.cwd());
    const { backend, frontendNodeId } = settings;
    const token =
      configurationEnvironment(settings)[backend.nextjsToFastapiTokenEnv ?? ""];
    if (!token || !/^[!-~]{32,}$/.test(token))
      return failure("请检查活动后端连接中的前端到后端节点令牌。");

    detail = "无法连接后端内部入口，请检查网络和 TLS 配置。";
    const response = await fetch(
      `${backend.baseUrl}/internal/frontend-nodes/${encodeURIComponent(frontendNodeId)}/sync`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        redirect: "manual",
        signal: AbortSignal.timeout(5000),
      },
    );
    if (response.status !== 200) {
      await response.body?.cancel();
      return failure(
        [401, 403].includes(response.status)
          ? "后端拒绝请求，请核对节点启用状态、内部访问来源及节点令牌。"
          : response.status >= 300 && response.status < 400
            ? "内部入口返回重定向，请检查活动后端连接的内部地址。"
            : `后端返回 HTTP ${response.status}，请查看后端日志。`,
      );
    }
    detail = "后端未确认任务入队，请检查后端版本及日志。";
    if (!(await accepted(response, frontendNodeId))) return failure(detail);
    console.info(
      `节点 ${frontendNodeId} 的同步任务已入队，请查看后端 Worker 投递日志。`,
    );
  } catch {
    failure(detail);
  }
}

await main();
