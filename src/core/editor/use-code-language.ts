"use client";
import { useEffect, useState } from "react";
import { LanguageDescription } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import { codeLanguage } from "@/core/rendering/features/model";
const empty: Extension = [];
const names: Record<string, string> = {
  xml: "HTML",
  cpp: "C++",
  csharp: "C#",
  bash: "Shell",
};
const pending = new Map<string, Promise<Extension>>();
function load(name: string) {
  if (!pending.has(name))
    pending.set(
      name,
      import("@codemirror/language-data")
        .then(async ({ languages }) => {
          const language = LanguageDescription.matchLanguageName(
            languages,
            names[name] ?? name,
          );
          return language ? language.load() : empty;
        })
        .catch(() => {
          pending.delete(name);
          return empty;
        }),
    );
  return pending.get(name)!;
}
export function useCodeLanguage(language: string) {
  const name = codeLanguage(language);
  const [loaded, setLoaded] = useState<{
    name: string;
    extension: Extension;
  }>();
  useEffect(() => {
    if (name === "plaintext") return;
    let active = true;
    void load(name).then((extension) => {
      if (active) setLoaded({ name, extension });
    });
    return () => {
      active = false;
    };
  }, [name]);
  return loaded?.name === name ? loaded.extension : empty;
}
