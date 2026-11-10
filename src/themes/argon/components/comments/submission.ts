import { captchaFailure } from "@/core/captcha/use-captcha";
import { RequestError } from "@/core/http/request";

export interface CommentSubmissionResult {
  accepted: boolean;
  message: string;
}

/** A missing receipt is uncertain, never an optimistic/local publication. */
export function commentSubmissionFailure(reason: unknown) {
  if (reason instanceof RequestError) {
    if (reason.kind === "network")
      return "暂时无法连接后端。输入已保留，请稍后重试。";
    if (reason.kind === "timeout")
      return "提交超时，暂时无法确认结果。输入已保留，重试不会重复提交。";
    if (reason.code === 40388)
      return "此内容已关闭评论或阅读验证已过期，请刷新页面。";
    if (reason.status === 429) return "提交较频繁，请稍后重试。输入已保留。";
    if (reason.status === 404)
      return "内容已不可用。输入已保留，请刷新页面核对。";
    if ([40386, 40387, 40986, 50386].includes(reason.code ?? 0))
      return captchaFailure(reason);
    if (reason.status === 503) return "后端暂不可用。输入已保留，请稍后重试。";
  }
  return "暂时无法确认提交结果。输入已保留，可以重试。";
}
