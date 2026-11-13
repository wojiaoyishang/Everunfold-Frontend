import { RequestError } from "@/core/http/request";
import { accountFailure } from "@/core/accounts/use-action";

export const pageUrlErrors = {
  40997: "此地址已被其他页面或内容使用，请更换路径。",
  42205: "页面 URL 必须以 / 开头。",
  42206: "请输入有效的站内路径，例如 /about。不能包含空格、查询参数或锚点。",
  42207: "这个页面 URL 由系统保留，请更换路径。",
  42208: "页面 URL 不能超过 500 个字符。",
  42209: "页面 URL 与站点的语言入口冲突，请更换路径。",
} as const;

export function isPageUrlFailure(error: unknown): boolean {
  return (
    error instanceof RequestError &&
    Object.hasOwn(pageUrlErrors, error.code ?? "")
  );
}

export function pagesFailure(error: unknown): string {
  if (error instanceof RequestError) {
    if (isPageUrlFailure(error))
      return pageUrlErrors[error.code as keyof typeof pageUrlErrors];
    if (error.code === 40497) return "页面模板不存在。";
    if (error.code === 40992) return "页面模板已被修改，请刷新后合并输入。";
    if (error.code === 40399)
      return "更新已发布页面使用的模板需要页面发布权限。";
    if (error.code === 42296)
      return "页面源码或配置超出大小限制，请缩减后重试。";
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
    if (error.code === 40998)
      return "前端页面实现尚未就绪，或节点版本不一致。可以保存草稿。";
    if (error.code === 42294) return "页面类型不存在或与已保存页面不一致。";
    if (error.code === 40397) return "页面脚本只能由管理员维护。";
    if (error.status === 503) return "页面服务暂不可用，请稍后重试。";
    if (error.status === 422)
      return "请检查必填字段、长度和格式。当前输入已保留。";
  }
  return accountFailure(error);
}
