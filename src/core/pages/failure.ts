import { RequestError } from "@/core/http/request";
import { accountFailure } from "@/core/accounts/use-action";
export function pagesFailure(error: unknown): string {
  if (error instanceof RequestError) {
    if (error.code === 40996)
      return "页面已在其他地方修改。你的输入已保留，请读取最新版本后核对。";
    if (error.code === 40999)
      return "页面内部元数据已被修改，请读取后重新合并。";
    if (error.status === 413) return "页面数据超出请求大小限制，请缩减后重试。";
    if (error.code === 40997)
      return "此地址已被其他页面或内容使用，请更换路径。";
    if (error.code === 40998)
      return "前端页面实现尚未就绪，或节点版本不一致。可以保存草稿。";
    if (error.code === 40397) return "页面脚本只能由管理员维护。";
    if (error.status === 422)
      return "请检查页面路径、人物字段长度和链接格式。当前输入已保留。";
  }
  return accountFailure(error);
}
