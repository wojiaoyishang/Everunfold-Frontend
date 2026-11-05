"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { queryDrafts } from "@/generated/content-admin-client";
import type { DraftListItem } from "@/generated/content-admin-contract";
import type { Locale } from "@/core/i18n/locale";
import { draftError } from "./draft-state";

export function useTranslationCandidates(
  type: string,
  language: Locale,
  search: string,
) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [items, setItems] = useState<DraftListItem[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      queryDrafts(
        baseUrl,
        {
          type_id: type,
          language,
          search,
          grouped: false,
          page: 1,
          page_size: 12,
          status: "all",
        },
        csrfToken,
        { signal: abort.signal },
      )
        .then(({ data }) => {
          if (!abort.signal.aborted) {
            setItems(data.items);
            setError("");
          }
        })
        .catch((cause: unknown) => {
          if (!abort.signal.aborted) setError(draftError(cause));
        })
        .finally(() => {
          if (!abort.signal.aborted) setLoading(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [baseUrl, csrfToken, type, language, search]);
  return { items, error, loading };
}
