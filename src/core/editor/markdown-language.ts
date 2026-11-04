import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { codeLanguageDescription } from "./code-language";

// The editing grammar adds lazy fence coloring; source/visual selection mapping stays unchanged.
export const markdownEditorLanguage = markdown({
  base: markdownLanguage,
  codeLanguages: codeLanguageDescription,
});
