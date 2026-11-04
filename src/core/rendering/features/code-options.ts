import { codeLanguage, escapeMarkup } from "./model";

/** Source metadata only. Reader actions never write these author preferences. */
export interface CodeOptions {
  title?: string;
  numbers?: "on" | "off";
  start?: number;
  mark?: string;
  wrap?: "on" | "off";
  fold?: number;
}
export function codeOptions(value: unknown): CodeOptions {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const raw = value as Record<string, unknown>,
    result: CodeOptions = {};
  if (typeof raw.title === "string")
    result.title = raw.title
      .replace(/[\r\n\x00-\x1f]/g, " ")
      .trim()
      .slice(0, 160);
  for (const key of ["numbers", "wrap"] as const)
    if (raw[key] === "on" || raw[key] === "off") result[key] = raw[key];
  if (
    Number.isInteger(raw.start) &&
    Number(raw.start) >= 1 &&
    Number(raw.start) <= 1_000_000
  )
    result.start = Number(raw.start);
  if (
    Number.isInteger(raw.fold) &&
    Number(raw.fold) >= 0 &&
    Number(raw.fold) <= 200
  )
    result.fold = Number(raw.fold);
  if (typeof raw.mark === "string" && validCodeMarks(raw.mark))
    result.mark = raw.mark.replace(/\s/g, "");
  return Object.fromEntries(
    Object.entries(result).filter(([, v]) => v !== ""),
  ) as CodeOptions;
}
export function validCodeMarks(value: string) {
  if (!value.trim()) return true;
  return (
    value.length <= 512 &&
    value.split(",").length <= 64 &&
    value.split(",").every((part) => {
      if (!/^\s*\d+(?:\s*-\s*\d+)?\s*$/.test(part)) return false;
      const [from, to = from] = part.split("-").map(Number);
      return from >= 1 && from <= to && to <= 1_000_000;
    })
  );
}
export function markedCodeLine(line: number, marks = "") {
  return marks.split(",").some((part) => {
    const [from, to = from] = part.split("-").map(Number);
    return line >= from && line <= to;
  });
}
export function parseCodeOptions(value = ""): CodeOptions {
  try {
    return value.length <= 2048 ? codeOptions(JSON.parse(value)) : {};
  } catch {
    return {};
  }
}
export function codeInfo(language: string, options?: CodeOptions) {
  const info = codeLanguage(language),
    normalized = codeOptions(options);
  return (
    (info === "plaintext" ? "" : info) +
    (Object.keys(normalized).length ? " " + JSON.stringify(normalized) : "")
  );
}
export function parseCodeInfo(info: string) {
  const match = /^\s*([^\s{]*)(?:\s*)([\s\S]*)$/.exec(info);
  return {
    language: codeLanguage(match?.[1] ?? ""),
    options: parseCodeOptions(match?.[2]),
  };
}
export function codeHtml(
  source: string,
  language: string,
  options?: CodeOptions,
) {
  const normalized = codeOptions(options);
  const data = Object.keys(normalized).length
    ? ` data-code="${escapeMarkup(JSON.stringify(normalized)).replaceAll('"', "&quot;")}"`
    : "";
  return `<pre${data}><code class="language-${codeLanguage(language)}">${escapeMarkup(source)}</code></pre>`;
}
