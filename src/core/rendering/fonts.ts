import type { MediaURL } from "@/core/contracts/content-admin";
import { resourceUrl } from "@/core/content/urls";

const identity = /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/;
export function fontFamily(id: string) {
  const key = id.replace(/^media:/, "");
  return identity.test(key) ? "ef-font-" + key : null;
}
/** Declarations do not preload files. Browsers request a face only when visible text uses it. */
export function fontFace(id: string, resource: MediaURL): string {
  const family = fontFamily(id),
    info = resource.font,
    url = resourceUrl(resource.original);
  if (!family || !info || !url) return "";
  const safe = url.replace(/[<>"'\\\r\n]/g, (char) => encodeURIComponent(char));
  const weight =
    info.weight_min === info.weight_max
      ? String(info.weight_min)
      : `${info.weight_min} ${info.weight_max}`;
  return `@font-face{font-family:"${family}";src:url("${safe}") format("${info.format}");font-weight:${weight};font-style:${info.style};font-display:swap;}`;
}
export function referencedFontFaces(
  html: string,
  media: Record<string, MediaURL> = {},
) {
  const ids = new Set(
    [
      ...html.matchAll(
        /data-font=["']site:\/\/media\/([0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12})["']/g,
      ),
    ].map((m) => m[1]),
  );
  return [...ids]
    .sort()
    .map((id) => (media[id] ? fontFace(id, media[id]) : ""))
    .join("\n");
}
