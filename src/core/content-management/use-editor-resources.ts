"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  readEditorOptions,
  createContentCategory,
} from "@/core/contracts/content-admin";
import type { EditorTerm, MediaURL } from "@/core/contracts/content-admin";
import type { MediaItem } from "@/core/contracts/settings";
import type { CodePreferences } from "@/core/contracts/settings";
import { readSettings } from "@/core/contracts/settings";

export function useEditorResources() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [terms, setTerms] = useState<EditorTerm[]>([]);
  const [media, setMedia] = useState<Record<string, MediaURL>>({});
  const [codePreferences, setCodePreferences] = useState<CodePreferences>({});
  useEffect(() => {
    const abort = new AbortController();
    void readSettings(baseUrl, { signal: abort.signal })
      .then((response) => {
        if (!abort.signal.aborted)
          setCodePreferences(response.data.value.theme.code ?? {});
      })
      .catch(() => {
        /* Editing remains available with built-in presentation defaults. */
      });
    void readEditorOptions(baseUrl, { signal: abort.signal })
      .then((response) => {
        if (!abort.signal.aborted) setTerms(response.data.terms ?? []);
      })
      .catch(() => {
        /* Suggestions are optional; manual entry remains available. */
      });
    return () => abort.abort();
  }, [baseUrl]);
  const remember = (item: MediaItem) =>
    setMedia((current) => ({
      ...current,
      [item.id.replace(/^media:/, "")]: { original: item.url },
    }));
  const createCategory = async (name: string, parentId: string | null) => {
    const response = await createContentCategory(
      baseUrl,
      { name, parent_id: parentId },
      csrfToken,
    );
    setTerms(response.data.terms);
    return response.data.terms.find(
      (term) =>
        term.kind === "category" &&
        term.name.toLocaleLowerCase() ===
          name.trim().normalize("NFC").toLocaleLowerCase(),
    );
  };
  return { terms, media, remember, createCategory, codePreferences };
}
