/** Validate the mounted frontend configuration with the actual runtime loader. */
import path from "node:path";
import { pathToFileURL } from "node:url";

try {
  const { readConfigurationFiles } = await import(
    pathToFileURL(path.resolve("src/core/config/files.ts")).href
  );
  const { settings } = readConfigurationFiles(process.cwd());
  const target = settings.backend.baseUrl.replace(/\/$/, "") + "/health/ready";
  console.log("Everunfold Frontend · 检测地址：GET " + target);
  for (const key of [
    settings.backend.nextjsToFastapiTokenEnv,
    settings.backend.fastapiToNextjsTokenEnv,
  ]) {
    if (!key || !/^[!-~]{32,}$/.test(process.env[key] ?? ""))
      throw new Error("节点令牌缺失或无效");
  }
  if (!settings.settings.sourceEpoch) throw new Error("后端来源 UUID 缺失");
  console.log("Everunfold Frontend · 配置与节点凭据检查通过");
  let response;
  try {
    response = await fetch(target, {
      signal: AbortSignal.timeout(5000),
      redirect: "manual",
    });
  } catch (error) {
    const code = error?.cause?.code;
    const reason =
      {
        ENOTFOUND: "容器内无法解析主机名；别名需要两端加入同一自定义网络",
        EAI_AGAIN: "DNS 解析暂时失败",
        ECONNREFUSED: "连接被拒绝，请检查后端是否监听及端口是否正确",
        ETIMEDOUT: "连接超时，请检查容器网络和防火墙",
        ENETUNREACH: "网络不可达",
        EHOSTUNREACH: "主机不可达",
        CERT_HAS_EXPIRED: "TLS 证书已过期",
        DEPTH_ZERO_SELF_SIGNED_CERT: "TLS 自签名证书未受信任",
        UNABLE_TO_VERIFY_LEAF_SIGNATURE: "TLS 证书链无法验证",
      }[code] ??
      (error?.name === "TimeoutError"
        ? "连接超时（5 秒）"
        : "连接失败，请检查网络或 TLS 证书");
    console.error(reason);
    console.error(
      "容器别名使用容器内部端口；host.docker.internal 使用宿主映射端口。",
    );
    throw new Error("后端连接检测失败");
  }
  if (!response.ok) {
    if (response.status >= 300 && response.status < 400)
      console.error("内部入口返回重定向；请填写最终内部地址，检测不跟随跳转。");
    console.error(
      "后端返回 HTTP " + response.status + "；请查看后端就绪状态及日志。",
    );
    throw new Error("后端尚未就绪");
  }
  console.log("Everunfold Frontend · 后端就绪接口通过");
} catch {
  console.error(
    "前端部署检查失败，请返回配置助手检查地址、令牌、来源 UUID 和后端状态。",
  );
  process.exitCode = 1;
}
