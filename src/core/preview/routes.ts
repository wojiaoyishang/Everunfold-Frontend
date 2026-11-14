import { contentPreviewPath } from "@/core/content-management/preview";
import { managedPagePreviewPath } from "@/core/pages/preview";

export type PreviewKind = "template" | "page" | "article" | "shuoshuo";
const uuid = "[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}";
export function livePreviewPath(kind: PreviewKind, id: string) {
  if (!new RegExp(`^${uuid}$`, "i").test(id))
    throw new Error("Invalid preview identity");
  return kind === "template"
    ? `/admin/pages/templates/${id}/live`
    : kind === "page"
      ? `/admin/pages/${id}/live`
      : `/admin/content/${kind}/${id}/live`;
}
export function isLivePreviewPath(path: string) {
  return new RegExp(
    `^/admin/(?:pages/(?:templates/)?${uuid}|content/(?:article|shuoshuo)/${uuid})/live/?$`,
    "i",
  ).test(path);
}
export function previewEditorPath(kind: PreviewKind, id: string) {
  livePreviewPath(kind, id);
  return kind === "template"
    ? `/admin/pages/templates/${id}`
    : kind === "page"
      ? `/admin/pages/${id}`
      : `/admin/content/${kind}/${id}/edit`;
}

export function frontendPreviewPath(
  kind: PreviewKind,
  id: string,
  embedded = false,
) {
  const path =
    kind === "page" || kind === "template"
      ? managedPagePreviewPath(id)
      : contentPreviewPath(kind, id);
  const query = new URLSearchParams();
  if (embedded) query.set("live-workspace", "1");
  if (kind === "template") query.set("template", "1");
  return query.size ? path + "?" + query : path;
}
