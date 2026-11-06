import { RequestError } from "@/core/http/request";
import { accountFailure } from "@/core/accounts/use-action";
export function pagesFailure(error: unknown): string {
  if (error instanceof RequestError) {
    if (error.code === 40996)
      return "页面已在其他地方修改。你的输入已保留，请先复制需要的修改，再刷新页面核对最新版本。";
    if (error.code === 40999)
      return "页面内部元数据已被修改，请读取后重新合并。";
    if (error.code === 40993)
      return "此页面尚无已应用内容，请确认应用当前草稿。";
    if (error.code === 40994) return "此语言已有页面，请编辑或恢复已有译文。";
    if (error.code === 40995) return "语言关联已变化，请刷新后重试。";
    if (error.code === 42297)
      return "请检查页面语言关联；前端注册页面的多语言由代码管理。";
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
