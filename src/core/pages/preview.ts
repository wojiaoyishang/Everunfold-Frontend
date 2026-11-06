const previewPath =
  /^\/admin\/pages\/[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}\/preview\/?$/i;
export const isManagedPagePreviewPath = (path: string) =>
  previewPath.test(path);
export function managedPagePreviewPath(id: string) {
  const path = `/admin/pages/${id}/preview`;
  if (!previewPath.test(path)) throw new Error("Invalid page preview identity");
  return path;
}
