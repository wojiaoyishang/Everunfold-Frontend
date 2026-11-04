import hljs from "highlight.js/lib/core";
import type { LanguageFn } from "highlight.js";
import { codeLanguage, escapeMarkup } from "./model";

const grammars: Record<string, () => Promise<{ default: LanguageFn }>> = {
  javascript: () => import("highlight.js/lib/languages/javascript"),
  typescript: () => import("highlight.js/lib/languages/typescript"),
  python: () => import("highlight.js/lib/languages/python"),
  xml: () => import("highlight.js/lib/languages/xml"),
  css: () => import("highlight.js/lib/languages/css"),
  json: () => import("highlight.js/lib/languages/json"),
  bash: () => import("highlight.js/lib/languages/bash"),
  sql: () => import("highlight.js/lib/languages/sql"),
  cpp: () => import("highlight.js/lib/languages/cpp"),
  csharp: () => import("highlight.js/lib/languages/csharp"),
  java: () => import("highlight.js/lib/languages/java"),
  go: () => import("highlight.js/lib/languages/go"),
  rust: () => import("highlight.js/lib/languages/rust"),
  php: () => import("highlight.js/lib/languages/php"),
  yaml: () => import("highlight.js/lib/languages/yaml"),
  markdown: () => import("highlight.js/lib/languages/markdown"),
  diff: () => import("highlight.js/lib/languages/diff"),
};
const loading = new Map<string, Promise<void>>();
export async function highlightCode(source: string, language: string) {
  const id = codeLanguage(language);
  if (!grammars[id] || source.length > 100_000) return escapeMarkup(source);
  if (!loading.has(id))
    loading.set(
      id,
      grammars[id]()
        .then(({ default: grammar }) => {
          hljs.registerLanguage(id, grammar);
        })
        .catch((error: unknown) => {
          loading.delete(id);
          throw error;
        }),
    );
  await loading.get(id);
  return hljs.highlight(source, { language: id, ignoreIllegals: true }).value;
}
