import type { AuthSessionState } from "@/generated/auth-contract";
import { RequestError } from "@/core/http/request";

export function checkedSession(
  session: AuthSessionState,
  admin = false,
): AuthSessionState {
  if (!session.csrf_token || session.authenticated !== (session.user !== null))
    throw new RequestError("invalid");
  if (admin && (!session.authenticated || session.user?.role !== "admin"))
    throw new RequestError("http", session.authenticated ? 403 : 401);
  return session;
}

export function authFailureMessage(
  error: unknown,
  intent: "login" | "session" | "logout",
): string {
  if (error instanceof RequestError) {
    if (error.status === 429) return "尝试次数较多，请稍后再试。";
    if (error.status === 401)
      return intent === "login"
        ? "用户名或密码不正确。"
        : "登录已失效，请重新登录。";
    if (error.status === 403)
      return intent === "session"
        ? "当前账号没有后台访问权限。"
        : "登录状态已更新，请重新检查后再试。";
    if (error.status === 413 || error.status === 415)
      return "登录请求格式不正确，请刷新页面后重试。";
    if (error.status === 422) return "请检查用户名和密码后再试。";
    if (error.status !== undefined && error.status >= 500)
      return intent === "logout"
        ? "登录服务暂时不可用，退出结果尚未确认，请重新检查。"
        : "登录服务暂时不可用，请稍后重试。";
    if (error.kind === "timeout")
      return intent === "logout"
        ? "连接超时，退出结果尚未确认，请重新检查。"
        : "连接超时，请检查网络后重试。";
    if (error.kind === "invalid")
      return intent === "logout"
        ? "退出结果无法确认，请重新检查登录状态。"
        : "登录服务返回了无法识别的结果，请重新检查。";
    if (error.kind === "network")
      return intent === "logout"
        ? "暂时无法确认退出结果，请重新检查登录状态。"
        : "暂时无法连接登录服务，请稍后重试。";
  }
  return intent === "logout"
    ? "暂时无法确认退出结果，请重新检查登录状态。"
    : "暂时无法连接登录服务，请稍后重试。";
}
