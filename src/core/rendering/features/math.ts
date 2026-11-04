import katex from "katex";
import { escapeMarkup } from "./model";

export function renderFormula(source: string, display: boolean) {
  try {
    if (source.length > 8000) throw new Error("formula size");
    return {
      html: katex.renderToString(source, {
        displayMode: display,
        output: "htmlAndMathml",
        trust: false,
        throwOnError: true,
        strict: "ignore",
        maxExpand: 1000,
        maxSize: 20,
        macros: {},
        globalGroup: false,
      }),
      error: false,
    };
  } catch {
    return {
      html: `<span class="formula-error" role="img" aria-label="公式无法解析">${escapeMarkup(source)}</span>`,
      error: true,
    };
  }
}
