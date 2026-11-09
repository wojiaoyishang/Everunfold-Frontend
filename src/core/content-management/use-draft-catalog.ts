"use client";
import { useEffect, useState } from "react";
import {
  queryDrafts,
  readContentTypes,
  readEditorOptions,
} from "@/core/contracts/content-admin";
import type {
  ContentTypeDefinition,
  DraftCatalog,
  EditorCatalog,
} from "@/core/contracts/content-admin";
import { useAdminRequest } from "@/core/admin/account-context";
import { draftError } from "./draft-state";
import {
  catalogQuery,
  defaultFilters,
  parseCatalogQuery,
  type CatalogFilters,
} from "./catalog-query";

export function useDraftCatalog(type: ContentTypeDefinition) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [filters, setFilters] = useState<CatalogFilters>(defaultFilters);
  const [page, setPage] = useState(1);
  const [ready, setReady] = useState(false);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DraftCatalog | null>(null);
  const [terms, setTerms] = useState<EditorCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compatible, setCompatible] = useState(false);
  const memory = `everunfold.content-list.${type.id}`;
  useEffect(() => {
    const restore = () => {
      let source = location.search;
      if (!source) {
        try {
          source = sessionStorage.getItem(memory) ?? "";
        } catch {}
      }
      const saved = parseCatalogQuery(source);
      setFilters(saved.filters);
      setSearch(saved.search);
      setAppliedSearch(saved.search);
      setPage(saved.page);
      setReady(true);
    };
    restore();
    window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, [memory]);
  useEffect(() => {
    if (!ready) return;
    const query = catalogQuery(filters, appliedSearch, page);
    window.history.replaceState(
      null,
      "",
      location.pathname + (query ? `?${query}` : ""),
    );
    try {
      sessionStorage.setItem(memory, query);
    } catch {}
  }, [filters, appliedSearch, page, memory, ready]);
  useEffect(() => {
    if (!ready) return;
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (
          filters.updated_from &&
          filters.updated_to &&
          filters.updated_from > filters.updated_to
        )
          throw new Error("结束时间应晚于开始时间。");
        const types = await readContentTypes(baseUrl, { signal: abort.signal });
        const active = types.data.items.find((item) => item.id === type.id);
        if (
          !active ||
          active.editor !== type.editor ||
          active.title_required !== type.title_required ||
          active.supports_excerpt !== type.supports_excerpt
        ) {
          if (!abort.signal.aborted) {
            setCompatible(false);
            setError("内容类型配置已变化，请更新前端后重试。");
          }
          return;
        }
        const [response, editor] = await Promise.all([
          queryDrafts(
            baseUrl,
            {
              type_id: type.id,
              search: appliedSearch,
              ...filters,
              page,
              page_size: 12,
            },
            csrfToken,
            { signal: abort.signal },
          ),
          readEditorOptions(baseUrl, { signal: abort.signal }),
        ]);
        if (!abort.signal.aborted) {
          setCompatible(true);
          setError("");
          setResult(response.data);
          setTerms(editor.data);
          const last = Math.max(
            1,
            Math.ceil(response.data.total / response.data.page_size),
          );
          if (page > last) setPage(last);
        }
      } catch (reason) {
        if (!abort.signal.aborted) {
          setCompatible(false);
          setError(
            reason instanceof Error &&
              reason.message === "结束时间应晚于开始时间。"
              ? reason.message
              : draftError(reason),
          );
        }
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [baseUrl, csrfToken, type, appliedSearch, filters, page, revision, ready]);
  const update = (patch: Partial<CatalogFilters>) => {
    setFilters((value) => ({ ...value, ...patch }));
    setPage(1);
    setLoading(true);
  };
  return {
    result,
    terms,
    loading,
    error,
    compatible,
    search,
    appliedSearch,
    filters,
    language: filters.language ?? "__all",
    setLanguage: (value: string) =>
      update({ language: value === "__all" ? null : value }),
    status: filters.status ?? "all",
    setStatus: (status: CatalogFilters["status"]) => update({ status }),
    page,
    setSearch,
    update,
    submitSearch: () => {
      setAppliedSearch(search.trim());
      setPage(1);
      setLoading(true);
      setRevision((v) => v + 1);
    },
    clearSearch: () => {
      setSearch("");
      setAppliedSearch("");
      setPage(1);
      setLoading(true);
    },
    clearFilters: () => {
      setFilters(defaultFilters);
      setSearch("");
      setAppliedSearch("");
      setPage(1);
      setLoading(true);
    },
    setPage: (value: number) => {
      setPage(value);
      setLoading(true);
    },
    refresh: () => {
      setLoading(true);
      setRevision((v) => v + 1);
    },
  };
}
