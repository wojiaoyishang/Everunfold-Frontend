export interface PreviewStamp {
  preview_session: string;
  preview_revision: number;
}
export function previewStamp(value: unknown): PreviewStamp | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  return typeof v.preview_session === "string" &&
    /^[a-f\d]{8}(?:-[a-f\d]{4}){3}-[a-f\d]{12}$/i.test(v.preview_session) &&
    typeof v.preview_revision === "number" &&
    Number.isSafeInteger(v.preview_revision) &&
    v.preview_revision > 0
    ? {
        preview_session: v.preview_session,
        preview_revision: v.preview_revision,
      }
    : null;
}
export function samePreview(a: PreviewStamp | null, b: PreviewStamp | null) {
  return (
    !!a &&
    !!b &&
    a.preview_session === b.preview_session &&
    a.preview_revision === b.preview_revision
  );
}
export function previewNavigation(path: string, origin: string): URL | null {
  try {
    const url = new URL(path, origin);
    return ["http:", "https:"].includes(url.protocol) &&
      !url.username &&
      !url.password
      ? url
      : null;
  } catch {
    return null;
  }
}
export function isEmbeddedEditor(): boolean {
  return (
    typeof window !== "undefined" &&
    window.parent !== window &&
    window.name.startsWith("everunfold-live-editor-")
  );
}
export function requestEmbeddedLeave(path: string): boolean {
  if (!isEmbeddedEditor()) return false;
  window.parent.postMessage(
    {
      type: "everunfold:embedded-leave-request",
      id: window.name.slice("everunfold-live-editor-".length),
      path,
    },
    window.location.origin,
  );
  return true;
}
