import { parseShortcodes } from "@/core/shortcodes/parser";

/** Local visual placeholders retain the complete native source, independently of applied styles. */
export function shortcodeSourceRanges(source: string, markdown = false) {
  const names = [
    ...source.matchAll(
      /\{\{<\s*(\/?)([a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)?)(?=\s|>)/g,
    ),
  ];
  const containers = new Set(
    names.filter((match) => match[1]).map((match) => match[2]),
  );
  const definitions = [...new Set(names.map((match) => match[2]))].map(
    (name) => ({
      name,
      kind: containers.has(name) ? ("container" as const) : ("leaf" as const),
    }),
  );
  return parseShortcodes(source, definitions, markdown).nodes.filter(
    (node) => !node.error,
  );
}

export function protectVisualShortcodes(source: string, markdown = false) {
  for (const node of shortcodeSourceRanges(source, markdown).reverse()) {
    const raw = source.slice(node.from, node.to);
    const escaped = raw
      .replaceAll("&", "&amp;")
      .replaceAll('"', "&quot;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    source =
      source.slice(0, node.from) +
      `<span data-editor-shortcode="${escaped}"></span>` +
      source.slice(node.to);
  }
  return source;
}
