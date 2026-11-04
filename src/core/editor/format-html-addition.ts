import { htmlUnits } from "./source-positions";

type Unit = ReturnType<typeof htmlUnits>[number];
const containers = new Set([
  "ul",
  "ol",
  "li",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "figure",
]);
const blocks = new Set([
  ...containers,
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "pre",
  "div",
  "figcaption",
  "img",
  "hr",
]);
const voids = new Set(["img", "hr"]);
const closed = (unit: Unit) => unit.key.startsWith("</");
const isBlock = (unit: Unit) => Boolean(unit.tag && blocks.has(unit.tag));

function lineBoundary(before: Unit | undefined, after: Unit | undefined) {
  if (!before?.tag || !after?.tag || !isBlock(before) || !isBlock(after))
    return false;
  if (closed(before) || voids.has(before.tag))
    return !closed(after) || containers.has(after.tag);
  return containers.has(before.tag) && !closed(after);
}

/** Format only newly added block structure; never reflow existing or inline source. */
export function formatHtmlAddition(
  source: string,
  start: number,
  end: number,
  before: Unit[],
  after: Unit[],
  projected: string,
) {
  const literal = (unit: Unit) => projected.slice(unit.start, unit.end);
  const plain = after.map(literal).join("");
  if (after.filter(isBlock).length <= before.filter(isBlock).length)
    return plain;
  const prefix = source.slice(0, start);
  const eol =
    prefix.match(/(\r\n|\n|\r)[^\r\n]*$/)?.[1] ??
    source.match(/\r\n|\n|\r/)?.[0] ??
    "\n";
  const line = prefix.slice(
    Math.max(prefix.lastIndexOf("\n"), prefix.lastIndexOf("\r")) + 1,
  );
  const leading = line.match(/^[\t ]*/)?.[0] ?? "";
  const indentUnit = leading.includes("\t") ? "\t" : "  ";
  let localDepth = 0,
    leadingClosures = 0;
  for (const unit of htmlUnits(line))
    if (unit.tag && containers.has(unit.tag))
      localDepth = Math.max(0, localDepth + (closed(unit) ? -1 : 1));
  for (const unit of after) {
    if (!unit.tag && !unit.key.trim()) continue;
    if (!closed(unit)) break;
    if (unit.tag && containers.has(unit.tag)) leadingClosures++;
  }
  const indent =
    leading + indentUnit.repeat(Math.max(0, localDepth - leadingClosures));
  let result = "",
    depth = 0;
  const raw = htmlUnits(source);
  const previous = raw.findLast((unit) => unit.tag && unit.end <= start);
  if (
    previous &&
    lineBoundary(previous, after[0]) &&
    /^[\t ]*$/.test(source.slice(previous.end, start))
  )
    result += eol + indent;
  for (let index = 0; index < after.length; index++) {
    const unit = after[index];
    if (unit.tag && containers.has(unit.tag) && closed(unit))
      depth = Math.max(0, depth - 1);
    if (index && lineBoundary(after[index - 1], unit))
      result += eol + indent + indentUnit.repeat(depth);
    result += literal(unit);
    if (unit.tag && containers.has(unit.tag) && !closed(unit)) depth++;
  }
  const next = raw.find((unit) => unit.tag && unit.start >= end);
  if (
    next &&
    lineBoundary(after.at(-1), next) &&
    /^[\t ]*$/.test(source.slice(end, next.start))
  )
    result +=
      eol +
      (next.tag &&
      containers.has(next.tag) &&
      closed(next) &&
      indent.endsWith(indentUnit)
        ? indent.slice(0, -indentUnit.length)
        : indent);
  return result;
}
