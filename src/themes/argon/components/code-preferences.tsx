"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { CodePreferences } from "@/core/contracts/settings";

export { codeFontFace, codePreferenceStyle } from "./code-preferences-model";

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
