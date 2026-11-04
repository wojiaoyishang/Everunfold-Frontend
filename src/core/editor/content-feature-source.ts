import { codeLanguage, formulaHtml } from "@/core/rendering/features/model";
import {
  codeHtml,
  codeInfo,
  type CodeOptions,
} from "@/core/rendering/features/code-options";
export type ContentFeatureKind = "code" | "math";
export interface ContentFeatureValue {
  source: string;
  language: string;
  display: boolean;
  codeOptions?: CodeOptions;
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
    return codeHtml(value.source, language, value.codeOptions);
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
    codeInfo(language, value.codeOptions) +
    "\n" +
    value.source +
    "\n" +
    fence
  );
}
