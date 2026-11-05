import { diff } from "@codemirror/merge";
import { DomUtils, parseDocument } from "htmlparser2";
import type { DraftFields } from "@/generated/content-admin-contract";

type Block = DraftFields["body"][number];
export type ComparedBlock = {
  id: string;
  before?: Block;
  after?: Block;
  moved: boolean;
  changed: boolean;
};
export const textDiff = (before: string, after: string) =>
  diff(before, after, { scanLimit: 5000, timeout: 50 });

/** Stable block IDs distinguish movement from edits and insertion shifts. */
export function compareBlocks(
  before: Block[],
  after: Block[],
): ComparedBlock[] {
  const left = new Map(before.map((block) => [block.id, block]));
  const right = new Map(after.map((block) => [block.id, block]));
  const oldOrder = before
    .filter((block) => right.has(block.id))
    .map((b) => b.id);
  const newOrder = after.filter((block) => left.has(block.id)).map((b) => b.id);
  // At most 128 blocks: retain a longest common subsequence as the unmoved anchors.
  const lengths = Array.from({ length: oldOrder.length + 1 }, () =>
    new Array<number>(newOrder.length + 1).fill(0),
  );
  for (let i = oldOrder.length - 1; i >= 0; i--)
    for (let j = newOrder.length - 1; j >= 0; j--)
      lengths[i][j] =
        oldOrder[i] === newOrder[j]
          ? lengths[i + 1][j + 1] + 1
          : Math.max(lengths[i + 1][j], lengths[i][j + 1]);
  const anchors = new Set<string>();
  for (let i = 0, j = 0; i < oldOrder.length && j < newOrder.length;) {
    if (oldOrder[i] === newOrder[j]) {
      anchors.add(oldOrder[i++]);
      j++;
    } else if (lengths[i + 1][j] >= lengths[i][j + 1]) i++;
    else j++;
  }
  const ids = after.map((block) => block.id);
  for (let i = before.length - 1; i >= 0; i--) {
    const id = before[i].id;
    if (right.has(id)) continue;
    const next = before.slice(i + 1).find((block) => ids.includes(block.id));
    ids.splice(next ? ids.indexOf(next.id) : ids.length, 0, id);
  }
  return ids.map((id) => {
    const a = left.get(id),
      b = right.get(id);
    const moved = Boolean(a && b && !anchors.has(id));
    return {
      id,
      before: a,
      after: b,
      moved,
      changed:
        !a || !b || moved || a.type !== b.type || a.content !== b.content,
    };
  });
}

type Node = ReturnType<typeof parseDocument>["children"][number];
function textNodes(nodes: Node[]): Extract<Node, { type: "text" }>[] {
  const result: Extract<Node, { type: "text" }>[] = [];
  for (const node of nodes) {
    if (node.type === "text") result.push(node);
    else if ("children" in node) {
      if (
        "name" in node &&
        (["pre", "code", "script", "style", "button", "svg"].includes(
          node.name,
        ) ||
          "data-math" in node.attribs ||
          "data-code-frame" in node.attribs)
      )
        continue;
      result.push(...textNodes(node.children));
    }
  }
  return result;
}
const escape = (value: string) =>
  value.replace(
    /[&<>\"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!,
  );

function unchangedText(docs: ReturnType<typeof parseDocument>[]) {
  const tags = new Set([
    "p",
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "li",
    "td",
    "th",
    "figcaption",
  ]);
  const candidates = docs.map((document) =>
    DomUtils.findAll((node) => tags.has(node.name), document.children).filter(
      (node) =>
        !DomUtils.findOne((child) => tags.has(child.name), node.children),
    ),
  );
  const right = new Map<string, (typeof candidates)[number]>();
  for (const node of candidates[1]) {
    const key = DomUtils.getOuterHTML(node, { encodeEntities: "utf8" });
    right.set(key, [...(right.get(key) ?? []), node]);
  }
  const preserved = [new Set<Node>(), new Set<Node>()];
  for (const node of candidates[0]) {
    const key = DomUtils.getOuterHTML(node, { encodeEntities: "utf8" });
    const match = right.get(key)?.shift();
    if (!match) continue;
    for (const text of textNodes(node.children)) preserved[0].add(text);
    for (const text of textNodes(match.children)) preserved[1].add(text);
  }
  return preserved;
}

/** Decorate already sanitized display HTML; never write the derived marks to source. */
export function highlightRenderedDiff(before: string, after: string) {
  const docs = [parseDocument(before), parseDocument(after)];
  const nodes = docs.map((document) => textNodes(document.children));
  const preserved = unchangedText(docs);
  const changes = textDiff(
    ...(nodes.map((list) => list.map((n) => n.data).join("")) as [
      string,
      string,
    ]),
  );
  return docs.map((document, side) => {
    let offset = 0;
    for (const node of nodes[side]) {
      const start = offset,
        end = (offset += node.data.length);
      if (preserved[side].has(node) || !node.data.trim()) continue;
      const ranges = changes
        .map((change) => [
          side === 0 ? change.fromA : change.fromB,
          side === 0 ? change.toA : change.toB,
        ])
        .filter(([a, b]) => a < end && b > start);
      if (!ranges.length) continue;
      let from = 0,
        markup = "";
      for (const [a, b] of ranges) {
        const low = Math.max(a - start, 0),
          high = Math.min(b - start, node.data.length);
        markup += escape(node.data.slice(from, low));
        markup += `<mark data-version-change="${side === 0 ? "removed" : "added"}">${escape(node.data.slice(low, high))}</mark>`;
        from = high;
      }
      markup += escape(node.data.slice(from));
      const span = parseDocument(`<span>${markup}</span>`).children[0];
      DomUtils.replaceElement(node, span);
    }
    return DomUtils.getInnerHTML(document, { encodeEntities: "utf8" });
  }) as [string, string];
}
