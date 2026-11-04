import { Parser } from "htmlparser2";
import type { Node as RichNode } from "@tiptap/pm/model";

export type SourceRange = { start: number; end: number };
type Unit = SourceRange & { key: string; tag?: string };
const aliases: Record<string, string> = { b: "strong", i: "em", del: "s" };

export function textUnits(text: string, start = 0): Unit[] {
  return Array.from(text, (key) => {
    const unit = { key, start, end: start + key.length };
    start = unit.end;
    return unit;
  });
}

export function htmlUnits(source: string): Unit[] {
  const units: Unit[] = [];
  const parser = new Parser({
    ontext(text) {
      const start = parser.startIndex,
        end = parser.endIndex + 1;
      if (source.slice(start, end) === text) {
        for (const unit of textUnits(text, start)) units.push(unit);
      } else {
        const at = start === end ? (units.at(-1)?.start ?? start) : start;
        for (const key of text) units.push({ key, start: at, end });
      }
    },
    onopentag(name, _, implied) {
      if (!implied) pushTag(name, false);
    },
    onclosetag(name, implied) {
      if (!implied) pushTag(name, true);
    },
  });
  function pushTag(name: string, closed: boolean) {
    const tag = aliases[name] ?? name;
    units.push({
      key: "<" + (closed ? "/" : "") + tag + ">",
      start: parser.startIndex,
      end: parser.endIndex + 1,
      tag,
    });
  }
  parser.end(source);
  return units;
}

/** Keep occurrence order even when the same text appears in several places. */
export function alignUnits(left: Unit[], right: Unit[]) {
  const result = new Map<number, number>();
  let a = 0,
    b = 0;
  while (a < left.length && b < right.length) {
    if (
      left[a].key === right[b].key &&
      Boolean(left[a].tag) === Boolean(right[b].tag)
    ) {
      result.set(a++, b++);
      continue;
    }
    // Formatting whitespace, generated wrappers and preview decoration may exist
    // in one projection only. Limit lookahead for long blocks.
    let found = false;
    for (let n = 1; n <= 64; n++) {
      if (left[a + n]?.key === right[b].key) {
        a += n;
        found = true;
        break;
      }
      if (right[b + n]?.key === left[a].key) {
        b += n;
        found = true;
        break;
      }
    }
    if (!found) {
      a++;
      b++;
    }
  }
  return result;
}

export function transferRange(
  from: Unit[],
  to: Unit[],
  range: SourceRange,
): SourceRange | undefined {
  // Runs of indentation and rendered line breaks do not identify a location.
  const stable = (unit: Unit) => unit.tag || /\S/u.test(unit.key);
  const left = from.filter(stable),
    right = to.filter(stable);
  const mapped = [...alignUnits(left, right)];
  const selected = mapped.filter(
    ([i]) => left[i].end > range.start && left[i].start < range.end,
  );
  if (selected.length)
    return {
      start: right[selected[0][1]].start,
      end: right[selected[selected.length - 1][1]].end,
    };
  const after = mapped.find(([i]) => left[i].end > range.start);
  const before = mapped.findLast(([i]) => left[i].end <= range.start);
  if (!after && !before) return;
  const closerBefore =
    before &&
    (!after ||
      range.start - left[before[0]].end <= left[after[0]].start - range.start);
  const point = closerBefore ? right[before[1]].end : right[after![1]].start;
  return { start: point, end: point };
}

export function richTextUnits(doc: RichNode) {
  const units: Unit[] = [];
  doc.descendants((node, pos) => {
    if (["inlineMath", "blockMath"].includes(node.type.name)) {
      for (const key of String(node.attrs.latex))
        units.push({ key, start: pos, end: pos + node.nodeSize });
      return false;
    }
    if (node.isText)
      for (const unit of textUnits(node.text ?? "", pos)) units.push(unit);
    const tag = { image: "img", hardBreak: "br", horizontalRule: "hr" }[
      node.type.name
    ];
    if (tag)
      units.push({
        tag,
        key: "<" + tag + ">",
        start: pos,
        end: pos + node.nodeSize,
      });
  });
  return units;
}

export function richSourceSelection(
  doc: RichNode,
  source: string,
  range: SourceRange,
  reverse = false,
) {
  if (doc.childCount === 1 && doc.firstChild?.type.name === "rawHtml")
    return reverse ? { start: 0, end: 1 } : { start: 0, end: source.length };
  const rich = richTextUnits(doc);
  const raw = htmlUnits(source).filter(
    (unit) => !unit.tag || ["<img>", "<hr>", "<br>"].includes(unit.key),
  );
  return reverse
    ? transferRange(raw, rich, range)
    : transferRange(rich, raw, range);
}
