import type { DraftBlock } from "@/core/contracts/content-admin";
import type { MediaItem } from "@/core/contracts/settings";
import { siteMediaReference } from "@/core/media/references";

export function titlePath(title: string): string {
  const slug = title
    .normalize("NFC")
    .trim()
    .replace(/[^\p{L}\p{N}_-]+/gu, "-")
    .replace(/^[-_]+|[-_]+$/g, "")
    .slice(0, 160);
  return slug ? `/${slug}.html` : "";
}

export function moveBlock(body: DraftBlock[], id: string, direction: -1 | 1) {
  const index = body.findIndex((part) => part.id === id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= body.length) return body;
  const next = [...body];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}
const escapeHTML = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function mediaMarkup(
  item: MediaItem,
  type: DraftBlock["type"],
  alt = "",
) {
  const url = siteMediaReference(item.id);
  const label = item.title || item.label;
  if (item.kind === "video")
    return type === "html"
      ? `<video controls preload="none" src="${url}"></video>`
      : `![](${url}){type=video}`;
  if (type === "html")
    return item.kind === "image"
      ? `<img src="${url}" alt="${escapeHTML(alt)}">`
      : `<a href="${url}">${escapeHTML(label)}</a>`;
  const text = (item.kind === "image" ? alt : label)
    .replace(/[\\\[\]<>]/g, "\\$&")
    .replace(/[\r\n]/g, " ");
  return `${item.kind === "image" ? "!" : ""}[${text}](${url})`;
}

/** Keep incomplete input in the draft so it cannot be silently discarded or saved. */
export function parseEditorDate(value: string): string | null {
  if (!value.trim()) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day, hour, minute] = match.map(Number);
  const date = new Date(year, month - 1, day, hour, minute);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute
  )
    return value;
  return date.toISOString();
}
export function formatEditorDate(value?: string | null): string {
  if (!value) return "";
  if (!/^\d{4}-\d{2}-\d{2}T/.test(value) || !Number.isFinite(Date.parse(value)))
    return value;
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
