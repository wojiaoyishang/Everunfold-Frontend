import {
  authoredCssScope,
  compileAuthoredCss,
} from "@/core/rendering/authored-css";

export function authoredStyle(
  identity: string,
  source?: string | readonly (string | undefined)[],
  limit?: number,
) {
  const id = identity.replace(/[^a-z\d_-]/gi, "_");
  const sheets = typeof source === "string" ? [source] : source;
  const css = sheets
    ?.flatMap((sheet) =>
      sheet ? [compileAuthoredCss(sheet, id, limit).css] : [],
    )
    .filter(Boolean)
    .join("\n");
  return {
    scope: css ? authoredCssScope(id) : undefined,
    style: css ? <style>{css}</style> : null,
  };
}
