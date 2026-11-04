import { parseDocument } from "htmlparser2";
import type { DraftBlock } from "@/generated/content-admin-contract";

export const UPLOAD_SCHEME = "everunfold-upload://";
const escape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export const uploadMarker = (id: string, name: string) =>
  `<img src="${UPLOAD_SCHEME}${id}" alt="${escape("正在上传 " + name)}">`;

export function uploadMarkers(source: string) {
  const found: { id: string; from: number; to: number }[] = [];
  const tree = parseDocument(source, {
    withStartIndices: true,
    withEndIndices: true,
  });
  const walk = (nodes: typeof tree.children) => {
    for (const node of nodes) {
      if (
        "attribs" in node &&
        node.name === "img" &&
        node.attribs.src?.startsWith(UPLOAD_SCHEME) &&
        node.startIndex !== null &&
        node.endIndex !== null
      ) {
        found.push({
          id: node.attribs.src.slice(UPLOAD_SCHEME.length),
          from: node.startIndex,
          to: node.endIndex + 1,
        });
      }
      if ("children" in node) walk(node.children);
    }
  };
  walk(tree.children);
  return found;
}

export function replaceUploadMarker(
  source: string,
  id: string,
  replacement: string,
) {
  let result = source;
  for (const item of uploadMarkers(source).reverse())
    if (item.id === id)
      result = result.slice(0, item.from) + replacement + result.slice(item.to);
  return result;
}

export const hasUploadMarkers = (body: DraftBlock[]) =>
  body.some((block) => uploadMarkers(block.content).length > 0);

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="240" viewBox="0 0 560 240"><defs><linearGradient id="g" x2="1" y2="1"><stop stop-color="#edf1f7"/><stop offset="1" stop-color="#d8e2f0"/></linearGradient></defs><rect width="560" height="240" rx="12" fill="url(#g)"/><path d="m115 180 78-83 62 61 52-43 138 65" fill="#c0cfe3"/><circle cx="361" cy="67" r="22" fill="#bacbe4"/><path d="M260 89h40m-20-20v40" stroke="#617da6" stroke-width="5" stroke-linecap="round"/></svg>`;
export const uploadPlaceholderImage =
  "data:image/svg+xml," + encodeURIComponent(svg);
