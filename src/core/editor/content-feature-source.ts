import {
  codeLanguage,
  escapeMarkup,
  formulaHtml,
} from "@/core/rendering/features/model";
export type ContentFeatureKind = "code" | "math";
export interface ContentFeatureValue {
  source: string;
  language: string;
  display: boolean;
}
export function featureSource(
  kind: ContentFeatureKind,
  value: ContentFeatureValue,
  format: "html" | "markdown",
) {
  if (kind === "math")
    return format === "html"
      ? formulaHtml(value.source, value.display)
      : value.display
        ? "$$\n" + value.source + "\n$$"
        : "$" + value.source.replace(/\r?\n/g, " ") + "$";
  const language = codeLanguage(value.language);
  if (format === "html")
    return `<pre><code class="language-${language}">${escapeMarkup(value.source)}</code></pre>`;
  const fence = "`".repeat(
    Math.max(
      3,
      ...Array.from(
        value.source.matchAll(/`+/g),
        (match) => match[0].length + 1,
      ),
    ),
  );
  return (
    fence +
    (language === "plaintext" ? "" : language) +
    "\n" +
    value.source +
    "\n" +
    fence
  );
}
