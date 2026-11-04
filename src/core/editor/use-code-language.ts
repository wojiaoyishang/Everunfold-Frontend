"use client";
import { useEffect, useState } from "react";
import type { Extension } from "@codemirror/state";
import { codeLanguage } from "@/core/rendering/features/model";
import { loadCodeLanguage } from "./code-language";
const empty: Extension = [];
export function useCodeLanguage(language: string) {
  const name = codeLanguage(language);
  const [loaded, setLoaded] = useState<{
    name: string;
    extension: Extension;
  }>();
  useEffect(() => {
    if (name === "plaintext") return;
    let active = true;
    void loadCodeLanguage(name).then((extension) => {
      if (active) setLoaded({ name, extension });
    });
    return () => {
      active = false;
    };
  }, [name]);
  return loaded?.name === name ? loaded.extension : empty;
}
