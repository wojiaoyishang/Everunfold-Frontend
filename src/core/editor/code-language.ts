import {
  LanguageDescription,
  LanguageSupport,
  StreamLanguage,
} from "@codemirror/language";
import { codeLanguage } from "@/core/rendering/features/model";

const plain = new LanguageSupport(
  StreamLanguage.define({
    token(stream) {
      stream.skipToEnd();
      return null;
    },
  }),
);
const names: Record<string, string> = {
  xml: "HTML",
  cpp: "C++",
  csharp: "C#",
  bash: "Shell",
};
const pending = new Map<string, Promise<LanguageSupport>>();
const descriptions = new Map<string, LanguageDescription>();

/** Both snippet windows and Markdown fences request only the grammar they use. */
export function loadCodeLanguage(language: string): Promise<LanguageSupport> {
  const name = codeLanguage(language);
  if (name === "plaintext") return Promise.resolve(plain);
  if (!pending.has(name))
    pending.set(
      name,
      import("@codemirror/language-data")
        .then(async ({ languages }) => {
          const language = LanguageDescription.matchLanguageName(
            languages,
            names[name] ?? name,
          );
          return language ? language.load() : plain;
        })
        .catch(() => {
          pending.delete(name);
          return plain;
        }),
    );
  return pending.get(name)!;
}

export function codeLanguageDescription(info: string) {
  const name = codeLanguage(info.trim().split(/\s+/, 1)[0]);
  if (name === "plaintext") return null;
  if (!descriptions.has(name))
    descriptions.set(
      name,
      LanguageDescription.of({
        name,
        load: () => loadCodeLanguage(name),
      }),
    );
  return descriptions.get(name)!;
}
