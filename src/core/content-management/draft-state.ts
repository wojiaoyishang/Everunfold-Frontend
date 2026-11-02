import type {
  DraftDetail,
  DraftFields,
  ContentTypeDefinition,
} from "@/generated/content-admin-contract";
import { RequestError } from "@/core/http/request";

export function draftFields(detail?: DraftDetail | null): DraftFields {
  return detail
    ? {
        title: detail.title,
        excerpt: detail.excerpt,
        body: detail.body.map((block) => ({ ...block })),
        settings: structuredClone(detail.settings ?? {}),
      }
    : {
        title: "",
        excerpt: "",
        body: [{ id: crypto.randomUUID(), type: "markdown", content: "" }],
        settings: {},
      };
}
export function validateDraft(
  fields: DraftFields,
  type: ContentTypeDefinition,
): string {
  if (type.title_required && !fields.title?.trim()) return "请先填写标题。";
  if ((fields.title?.length ?? 0) > 200) return "标题不能超过 200 字符。";
  const date = fields.settings?.display_published_at;
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date)))
  )
    return "请填写有效的显示时间，格式为 YYYY-MM-DD HH:mm。";
  if (fields.body.length < 1 || fields.body.length > 128)
    return "正文需要 1 至 128 个块。";
  if (
    fields.body.some((block) => block.content.length > 100_000) ||
    fields.body.reduce((n, b) => n + b.content.length, 0) > 200_000
  )
    return "正文过长，请缩短后再保存。";
  return "";
}
export function draftError(error: unknown): string {
  if (error instanceof RequestError) {
    if (error.status === 401 || error.status === 403)
      return "登录状态或权限已变化，请重新登录后再操作。";
    if (error.code === 40951)
      return "这份内容已在其他地方修改。你的输入已保留，请先查看最新内容。";
    if (error.code === 40953)
      return "正文或封面引用的文件已删除或尚未上传完成，请重新选择。";
    if (error.code === 40954)
      return "这个访问路径已被其他内容使用，请换一个路径。";
    if (error.code === 42258)
      return "暂不支持定时发布，请使用当前或过去的显示时间。";
    if (error.status === 404) return "没有找到这份内容，请刷新列表。";
    if (error.status === 409) return "内容状态已变化，请重新读取后操作。";
    if (error.status === 422)
      return "内容未通过校验，请检查正文、路径和内容属性。";
  }
  return "暂时无法连接，请稍后重试。";
}
export function uncertainWrite(error: unknown): boolean {
  return (
    !(error instanceof RequestError) ||
    error.status === undefined ||
    error.status >= 500
  );
}
