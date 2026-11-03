import * as Y from "yjs";
import type { DraftFields } from "@/generated/content-admin-contract";
import { richFields, richHtml } from "@/core/editor/rich-text";

export const LOCAL = Symbol("editor-local");
export const REMOTE = Symbol("server-or-local-recovery");
export const SOURCE_OWN = Symbol("own-committed-source");
const texts = ["title", "excerpt", "seo_title", "seo_description"] as const;
const policy = new Set(["visibility", "opens_at"]);
type Settings = NonNullable<DraftFields["settings"]>;

export function createScratch(fields: DraftFields) {
  const doc = new Y.Doc();
  doc.transact(() => {
    const meta = doc.getMap("meta");
    for (const key of texts)
      meta.set(
        key,
        new Y.Text(
          key === "title" || key === "excerpt"
            ? (fields[key] ?? "")
            : (fields.settings?.[key] ?? ""),
        ),
      );
    const settings = new Y.Map();
    for (const [key, value] of Object.entries(fields.settings ?? {}))
      if (!policy.has(key) && !texts.some((t) => t === key))
        settings.set(key, value);
    meta.set("settings", settings);
    for (const block of fields.body)
      doc.getMap("blocks").set(block.id, makeBlock(block));
    doc.getArray<string>("order").push(fields.body.map((b) => b.id));
  }, REMOTE);
  return doc;
}

export function makeBlock(block: DraftFields["body"][number]) {
  return new Y.Map<unknown>([
    ["type", block.type ?? "markdown"],
    ["content", new Y.Text(block.content)],
    ["deleted", false],
    ...(block.type === "html" ? Object.entries(richFields(block.content)) : []),
  ]);
}

export function blockText(doc: Y.Doc, id: string): Y.Text {
  const block = doc.getMap<Y.Map<unknown>>("blocks").get(id);
  const text = block?.get("content");
  if (!(text instanceof Y.Text)) throw new Error("正文块不可用");
  return text;
}

export function removedBlocks(
  doc: Y.Doc,
  fields: DraftFields,
): DraftFields["body"] {
  const visible = new Set(fields.body.map((block) => block.id));
  return [...doc.getMap<Y.Map<unknown>>("blocks")].flatMap(([id, block]) =>
    visible.has(id)
      ? []
      : [
          {
            id,
            type: block.get("type") as "markdown" | "html",
            content: richHtml(block),
          },
        ],
  );
}

export function projectDocument(
  doc: Y.Doc,
  privateFields: DraftFields,
): DraftFields {
  const meta = doc.getMap<unknown>("meta");
  const blocks = doc.getMap<Y.Map<unknown>>("blocks");
  const settings = (
    meta.get("settings") as Y.Map<unknown>
  ).toJSON() as Settings;
  const seen = new Set<string>();
  const body = doc
    .getArray<string>("order")
    .toArray()
    .flatMap((id) => {
      const block = blocks.get(id);
      if (!block || seen.has(id) || block.get("deleted")) return [];
      seen.add(id);
      return [
        {
          id,
          type: block.get("type") as "markdown" | "html",
          content: richHtml(block),
        },
      ];
    });
  return {
    title: String(meta.get("title") ?? ""),
    excerpt: String(meta.get("excerpt") ?? ""),
    body,
    settings: {
      ...settings,
      seo_title: String(meta.get("seo_title") ?? ""),
      seo_description: String(meta.get("seo_description") ?? ""),
      visibility: privateFields.settings?.visibility ?? "public",
      opens_at: privateFields.settings?.opens_at ?? null,
    },
    access_password: privateFields.access_password ?? null,
  };
}

/** Minimal UTF-16 splice preserves concurrent inserts and avoids splitting surrogate pairs. */
export function replaceText(text: Y.Text, value: string) {
  const before = text.toString();
  if (before === value) return;
  let start = 0,
    end = 0;
  while (
    start < before.length &&
    start < value.length &&
    before[start] === value[start]
  )
    start++;
  if (start > 0 && /[\uD800-\uDBFF]/.test(before[start - 1])) start--;
  while (
    end < before.length - start &&
    end < value.length - start &&
    before[before.length - 1 - end] === value[value.length - 1 - end]
  )
    end++;
  if (end > 0 && /[\uDC00-\uDFFF]/.test(before[before.length - end])) end--;
  text.delete(start, before.length - start - end);
  text.insert(start, value.slice(start, value.length - end));
}

export function applyFields(
  doc: Y.Doc,
  next: DraftFields,
  previous: DraftFields = projectDocument(doc, next),
) {
  doc.transact(() => {
    const meta = doc.getMap<unknown>("meta");
    for (const key of texts) {
      const value =
        key === "title" || key === "excerpt"
          ? (next[key] ?? "")
          : (next.settings?.[key] ?? "");
      const before =
        key === "title" || key === "excerpt"
          ? (previous[key] ?? "")
          : (previous.settings?.[key] ?? "");
      if (value !== before) replaceText(meta.get(key) as Y.Text, value);
    }
    const settings = meta.get("settings") as Y.Map<unknown>;
    for (const [key, value] of Object.entries(next.settings ?? {})) {
      if (policy.has(key) || texts.some((t) => t === key)) continue;
      if (
        JSON.stringify(previous.settings?.[key as keyof Settings]) !==
        JSON.stringify(value)
      )
        settings.set(key, value);
    }
    const blocks = doc.getMap<Y.Map<unknown>>("blocks");
    const wanted = new Set(next.body.map((b) => b.id));
    for (const prior of previous.body) {
      const block = blocks.get(prior.id);
      if (block && !wanted.has(prior.id) && !block.get("deleted"))
        block.set("deleted", true);
    }
    for (const part of next.body) {
      const block = blocks.get(part.id);
      if (!block) blocks.set(part.id, makeBlock(part));
      else if (!block.get("deleted")) {
        const before = previous.body.find((b) => b.id === part.id);
        if (before && before.type !== part.type) {
          block.set("type", part.type ?? "markdown");
          replaceText(block.get("content") as Y.Text, part.content);
          if (part.type === "html")
            for (const [key, value] of Object.entries(richFields(part.content)))
              block.set(key, value);
          else {
            block.delete("rich");
            block.delete("rich_base");
          }
        }
        if (before && before.content !== part.content)
          if (!(block.get("rich") instanceof Y.XmlFragment))
            replaceText(block.get("content") as Y.Text, part.content);
      }
    }
    const order = doc.getArray<string>("order");
    const ids = next.body.map((b) => b.id);
    const oldIds = previous.body.map((b) => b.id);
    const removed = new Set(oldIds.filter((id) => !wanted.has(id)));
    for (let i = order.length - 1; i >= 0; i--)
      if (removed.has(order.get(i))) order.delete(i, 1);
    const insertBeforeFollowing = (id: string) => {
      const following = ids
        .slice(ids.indexOf(id) + 1)
        .find((key) => order.toArray().includes(key));
      order.insert(
        following ? order.toArray().indexOf(following) : order.length,
        [id],
      );
    };
    for (const id of ids) if (!oldIds.includes(id)) insertBeforeFollowing(id);
    const oldCommon = oldIds.filter((id) => wanted.has(id));
    const newCommon = ids.filter((id) => oldIds.includes(id));
    if (JSON.stringify(oldCommon) !== JSON.stringify(newCommon)) {
      const moved = oldCommon.find(
        (id) =>
          JSON.stringify(oldCommon.filter((key) => key !== id)) ===
          JSON.stringify(newCommon.filter((key) => key !== id)),
      );
      if (moved) {
        // Remove only the moved ID, preserving concurrently inserted neighbors.
        for (let i = order.length - 1; i >= 0; i--)
          if (order.get(i) === moved) order.delete(i, 1);
        insertBeforeFollowing(moved);
      }
    }
  }, LOCAL);
}

export function toBase64(value: Uint8Array) {
  let result = "";
  for (let i = 0; i < value.length; i += 8192)
    result += String.fromCharCode(...value.subarray(i, i + 8192));
  return btoa(result);
}
export function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}
