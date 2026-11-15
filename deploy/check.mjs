/** Validate the mounted frontend configuration with the actual runtime loader. */
import path from "node:path";
import { pathToFileURL } from "node:url";

try {
  const { readConfigurationFiles } = await import(
    pathToFileURL(path.resolve("src/core/config/files.ts")).href
  );
  const { settings } = readConfigurationFiles(process.cwd());
  for (const key of [
    settings.backend.nextjsToFastapiTokenEnv,
    settings.backend.fastapiToNextjsTokenEnv,
  ]) {
    if (!key || !/^[!-~]{32,}$/.test(process.env[key] ?? ""))
      throw new Error("节点令牌缺失或无效");
  }
  if (!settings.settings.sourceEpoch) throw new Error("后端来源 UUID 缺失");
  console.log("Everunfold Frontend · 配置与节点凭据检查通过");
  const response = await fetch(settings.backend.baseUrl + "/health/ready", {
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok) throw new Error("后端尚未就绪");
  console.log("Everunfold Frontend · 后端就绪接口通过");
} catch {
  console.error(
    "前端部署检查失败，请返回配置助手检查地址、令牌、来源 UUID 和后端状态。",
  );
  process.exitCode = 1;
}
