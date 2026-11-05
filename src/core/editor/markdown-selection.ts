import type { Language } from "@codemirror/language";
import { htmlUnits, textUnits } from "./source-positions";
import { shortcodeSourceRanges } from "./shortcode-source";

const skipped = new Set([
  "HeaderMark",
  "EmphasisMark",
  "LinkMark",
  "ListMark",
  "QuoteMark",
  "CodeMark",
  "CodeInfo",
  "TableDelimiter",
  "LinkTitle",
  "StrikethroughMark",
  "HTMLTag",
  "LinkReference",
]);

export function markdownUnits(parser: Language["parser"], source: string) {
  const parts: ReturnType<typeof textUnits> = [];
  let at = 0;
  const copy = (end: number) => {
    if (end > at)
      for (const unit of textUnits(source.slice(at, end), at)) parts.push(unit);
  };
  parser.parse(source).iterate({
    enter(node) {
      if (node.to <= at) return false;
      const video =
        node.name === "Image" && source.startsWith("{type=video}", node.to);
      const tag = video
        ? "video"
        : { Image: "img", HardBreak: "br", HorizontalRule: "hr" }[node.name];
      if (tag) {
        copy(node.from);
        parts.push({
          key: "<" + tag + ">",
          tag,
          start: node.from,
          end: video ? node.to + "{type=video}".length : node.to,
        });
        at = video ? node.to + "{type=video}".length : node.to;
        return false;
      }
      if (
        skipped.has(node.name) ||
        (node.name === "URL" &&
          ["Link", "Image"].includes(node.node.parent?.name ?? ""))
      ) {
        copy(node.from);
        at = node.to;
        return false;
      }
      if (
        node.name === "Entity" ||
        node.name === "Escape" ||
        node.name === "HTMLBlock"
      ) {
        copy(node.from);
        const text = source.slice(node.from, node.to);
        if (node.name === "Escape")
          parts.push(...textUnits(text.slice(1), node.from + 1));
        else
          parts.push(
            ...htmlUnits(text)
              .filter(
                (unit) =>
                  !unit.tag ||
                  ["shortcode", "video", "img", "br", "hr"].includes(unit.tag),
              )
              .map((unit) => ({
                ...unit,
                start: node.from + unit.start,
                end: node.from + unit.end,
              })),
          );
        at = node.to;
        return false;
      }
    },
  });
  copy(source.length);
  const calls = shortcodeSourceRanges(source, true);
  return [
    ...parts.filter(
      (unit) =>
        !calls.some((call) => unit.start < call.to && unit.end > call.from),
    ),
    ...calls.map((call) => ({
      key: source.slice(call.from, call.to),
      tag: "shortcode",
      start: call.from,
      end: call.to,
    })),
  ].sort((a, b) => a.start - b.start);
}
