import type { EditorTerm } from "@/generated/content-admin-contract";
export function categoryTree(terms: EditorTerm[]) {
  const categories = terms.filter((term) => term.kind === "category");
  const ids = new Set(categories.map((term) => term.id));
  const children = new Map<string | null, EditorTerm[]>();
  for (const term of categories) {
    const parent =
      term.parent_id && ids.has(term.parent_id) ? term.parent_id : null;
    children.set(parent, [...(children.get(parent) ?? []), term]);
  }
  for (const list of children.values())
    list.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"));
  const stack = (children.get(null) ?? [])
    .map((term) => ({ term, depth: 0 }))
    .reverse();
  const seen = new Set<string>();
  const rows: { term: EditorTerm; depth: number }[] = [];
  while (stack.length) {
    const row = stack.pop()!;
    if (seen.has(row.term.id)) continue;
    seen.add(row.term.id);
    rows.push(row);
    stack.push(
      ...(children.get(row.term.id) ?? [])
        .map((term) => ({ term, depth: row.depth + 1 }))
        .reverse(),
    );
  }
  for (const term of categories)
    if (!seen.has(term.id)) rows.push({ term, depth: 0 });
  return rows;
}
export function tagFontSize(count: number, maximum: number): number {
  return 12 + (10 * Math.log1p(count)) / Math.log1p(Math.max(1, maximum));
}
