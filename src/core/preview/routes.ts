export type PreviewKind = "page" | "article" | "shuoshuo";
const uuid = "[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}";
export function livePreviewPath(kind: PreviewKind, id: string) {
  if (!new RegExp(`^${uuid}$`, "i").test(id))
    throw new Error("Invalid preview identity");
  return kind === "page"
    ? `/admin/pages/${id}/live`
    : `/admin/content/${kind}/${id}/live`;
}
export function isLivePreviewPath(path: string) {
  return new RegExp(
    `^/admin/(?:pages/${uuid}|content/(?:article|shuoshuo)/${uuid})/live/?$`,
    "i",
  ).test(path);
}
export function previewEditorPath(kind: PreviewKind, id: string) {
  livePreviewPath(kind, id);
  return kind === "page"
    ? `/admin/pages/${id}`
    : `/admin/content/${kind}/${id}/edit`;
}
