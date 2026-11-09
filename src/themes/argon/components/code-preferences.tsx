"use client";
import {
  createContext,
  useContext,
  type CSSProperties,
  type ReactNode,
} from "react";
import type { CodePreferences } from "@/core/contracts/settings";
import { fontFace, fontFamily } from "@/core/fonts/media";

const CodeContext = createContext<CodePreferences>({});
export function CodePreferencesProvider({
  value,
  children,
}: {
  value?: CodePreferences;
  children?: ReactNode;
}) {
  return (
    <CodeContext.Provider value={value ?? {}}>{children}</CodeContext.Provider>
  );
}
export const useCodePreferences = () => useContext(CodeContext);
export function codePreferenceStyle(code: CodePreferences): CSSProperties {
  const size = code.font_size ?? 13,
    height = code.line_height ?? 1.7,
    fold = code.collapse_lines ?? 18;
  return {
    "--code-font-size": size + "px",
    "--code-line-height": height,
    "--code-tab-size": code.tab_size ?? 4,
    "--code-number-width": code.line_numbers === false ? "0px" : "4.5ch",
    "--code-default-wrap": code.wrap ? "pre-wrap" : "pre",
    "--code-default-break": code.wrap ? "anywhere" : "normal",
    "--code-fold-lines": fold,
    "--code-fold-size": fold
      ? `calc(${fold} * ${height} * ${size}px + 28px)`
      : "none",
    ...(code.font_media_id && code.font_url && code.font_info
      ? {
          "--code-font-family": `"${fontFamily(code.font_media_id)}", ui-monospace, monospace`,
        }
      : {}),
  } as CSSProperties;
}
export function codeFontFace(code: CodePreferences) {
  return code.font_media_id && code.font_url && code.font_info
    ? fontFace(code.font_media_id, {
        original: code.font_url,
        font: code.font_info,
      })
    : "";
}
