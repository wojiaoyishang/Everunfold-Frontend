import type { MenuItem } from "@/generated/settings-contract";
export interface MenuEntry {
  item: MenuItem;
  parentId: string | null;
  depth: number;
  index: number;
  siblings: number;
  ancestors: string[];
}
/** Iterative projection keeps deep trees usable without endlessly indented forms. */
export function flattenMenu(items: MenuItem[]): MenuEntry[] {
  const entries: MenuEntry[] = [];
  const pending = items
    .map((item, index) => ({
      item,
      index,
      depth: 0,
      parentId: null as string | null,
      siblings: items.length,
      ancestors: [] as string[],
    }))
    .reverse();
  while (pending.length) {
    const entry = pending.pop()!;
    entries.push(entry);
    const children = entry.item.children ?? [];
    pending.push(
      ...children
        .map((item, index) => ({
          item,
          index,
          depth: entry.depth + 1,
          parentId: entry.item.id,
          siblings: children.length,
          ancestors: [...entry.ancestors, entry.item.id],
        }))
        .reverse(),
    );
  }
  return entries;
}
export function updateMenu(
  items: MenuItem[],
  id: string,
  update: (item: MenuItem) => MenuItem,
): MenuItem[] {
  return items.map((item) =>
    item.id === id
      ? update(item)
      : { ...item, children: updateMenu(item.children ?? [], id, update) },
  );
}
export function removeMenu(items: MenuItem[], id: string): MenuItem[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeMenu(item.children ?? [], id),
    }));
}
export function reparentMenu(
  items: MenuItem[],
  id: string,
  parentId: string | null,
): MenuItem[] {
  const all = flattenMenu(items);
  const entry = all.find((row) => row.item.id === id);
  const parent = all.find((row) => row.item.id === parentId);
  if (
    !entry ||
    (parentId !== null &&
      (!parent || parentId === id || parent.ancestors.includes(id)))
  )
    return items;
  if (entry.parentId === parentId) return items;
  const rest = removeMenu(items, id);
  return parentId === null
    ? [...rest, entry.item]
    : updateMenu(rest, parentId, (item) => ({
        ...item,
        children: [...(item.children ?? []), entry.item],
      }));
}
export function moveMenu(
  items: MenuItem[],
  id: string,
  offset: number,
): MenuItem[] {
  const index = items.findIndex((item) => item.id === id);
  if (index >= 0) {
    if (index + offset < 0 || index + offset >= items.length) return items;
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    return next;
  }
  return items.map((item) => ({
    ...item,
    children: moveMenu(item.children ?? [], id, offset),
  }));
}
