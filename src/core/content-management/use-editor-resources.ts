"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { readEditorOptions } from "@/generated/content-admin-client";
import type { EditorTerm, MediaURL } from "@/generated/content-admin-contract";
import type { MediaItem } from "@/generated/settings-contract";

export function useEditorResources() {
  const { baseUrl } = useAdminRequest();
  const [terms, setTerms] = useState<EditorTerm[]>([]);
  const [media, setMedia] = useState<Record<string, MediaURL>>({});
  useEffect(() => {
    const abort = new AbortController();
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
  return { terms, media, remember };
}
