import { randomUUID } from "@/core/browser/crypto";
import { hasUploadMarkers } from "@/core/editor/upload-placeholders";
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
        access_password: null,
      }
    : {
        title: "",
        excerpt: "",
        body: [{ id: randomUUID(), type: "markdown", content: "" }],
        settings: {},
        access_password: null,
      };
}
export function validateDraft(
  fields: DraftFields,
  type: ContentTypeDefinition,
): string {
  if (hasUploadMarkers(fields.body))
    return "请等待图片上传完成，或移除未完成的图片占位。";
  if (type.title_required && !fields.title?.trim()) return "请先填写标题。";
  if ((fields.title?.length ?? 0) > 200) return "标题不能超过 200 字符。";
  const date = fields.settings?.display_published_at;
  if (
    date &&
    (!/^\d{4}-\d{2}-\d{2}T/.test(date) || !Number.isFinite(Date.parse(date)))
  )
    return "请填写有效的显示时间，格式为 YYYY-MM-DD HH:mm。";
  const opens = fields.settings?.opens_at;
  if (
    opens &&
    (!/^\d{4}-\d{2}-\d{2}T/.test(opens) || !Number.isFinite(Date.parse(opens)))
  )
    return "请填写有效的自动开放时间。";
  if (fields.access_password && fields.access_password.length > 200)
    return "文章密码不能超过 200 字符。";
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
  if (error instanceof Error && !(error instanceof RequestError))
    return error.message;
  if (error instanceof RequestError) {
    if (error.code === 40980)
      return "正在合并版本，最新版暂时只读。输入已保留，请从草稿分支恢复。";
    if (error.code === 40981) return "无法确认共同基线，请保留或导出本地草稿。";
    if (error.code === 40982) return "当前最新版不能删除。";
    if (error.code === 40983)
      return "草稿编号已用于其他内容，请保留本地草稿并重新比较。";
    if (error.code === 40984)
      return "合并编辑权已过期，结果已保留，请重新比较最新版。";
    if (error.code === 40985) return "请先处理全部合并冲突。";
    if (error.status === 401 || error.status === 403)
      return "登录状态或权限已变化，请重新登录后再操作。";
    if (error.code === 40951 || error.code === 40976)
      return "这份内容已在其他地方修改。你的输入已保留，请先查看最新内容。";
    if (error.code === 40953)
      return "正文或封面引用的文件已删除或尚未上传完成，请重新选择。";
    if (error.code === 40954)
      return "这个访问路径已被其他内容使用，请换一个路径。";
    if (error.code === 42258)
      return "显示时间不能晚于实际发布时间；延后发布请设置定时发布。";
    if (error.code === 42257) return "请选择晚于当前时间的定时发布时间。";
    if (error.code === 42259)
      return "请先设置文章密码，再启用密码保护或定时开放。";
    if (error.status === 404) return "没有找到这份内容，请刷新列表。";
    if (error.status === 409) return "内容状态已变化，请重新读取后操作。";
    if (error.status === 422)
      return "内容未通过校验，请检查正文、路径和内容属性。";
  }
  return "暂时无法连接，请稍后重试。";
}
export function validatePublicationTime(
  value: string | null | undefined,
): string {
  if (!value || !Number.isFinite(Date.parse(value)))
    return "请选择定时发布时间。";
  if (Date.parse(value) <= Date.now())
    return "请选择晚于当前时间的定时发布时间。";
  return "";
}
export function uncertainWrite(error: unknown): boolean {
  return (
    !(error instanceof RequestError) ||
    error.status === undefined ||
    error.status >= 500
  );
}
