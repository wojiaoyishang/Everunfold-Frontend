"use client";
import { useEffect, useState } from "react";
import {
  queryTaxonomies,
  type TaxonomyCatalog,
  type TaxonomyQuery,
} from "@/core/contracts/content-admin";
import { useAdminRequest } from "@/core/admin/account-context";
import { draftError } from "./draft-state";
export function useTaxonomies(
  kind: TaxonomyQuery["kind"],
  search: string,
  page: number,
  allowed: boolean,
) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [data, setData] = useState<TaxonomyCatalog | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  const queryKey = JSON.stringify([kind, search, page, revision]);
  const [receivedKey, setReceivedKey] = useState("");
  const [settledKey, setSettledKey] = useState("");
  useEffect(() => {
    if (!allowed) return;
    const abort = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      queryTaxonomies(
        baseUrl,
        { kind, search, page, page_size: 20 },
        csrfToken,
        { signal: abort.signal },
      )
        .then((result) => {
          if (!abort.signal.aborted) {
            setData(result.data);
            setReceivedKey(queryKey);
            setError("");
          }
        })
        .catch((reason) => {
          if (!abort.signal.aborted) setError(draftError(reason));
        })
        .finally(() => {
          if (!abort.signal.aborted) {
            setLoading(false);
            setSettledKey(queryKey);
          }
        });
    }, 160);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [kind, search, page, revision, baseUrl, csrfToken, allowed, queryKey]);
  return {
    data: receivedKey === queryKey ? data : null,
    error: settledKey === queryKey ? error : "",
    loading: loading || settledKey !== queryKey,
    refresh: () => setRevision((v) => v + 1),
  };
}
