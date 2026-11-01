"use client";
import { useEffect, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  queryDrafts,
  readContentTypes,
} from "@/generated/content-admin-client";
import type {
  ContentTypeDefinition,
  DraftCatalog,
  DraftQuery,
} from "@/generated/content-admin-contract";
import { draftError } from "./draft-state";

export function useDraftCatalog(type: ContentTypeDefinition) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [search, setSearch] = useState("");
  const [status, setStatus] =
    useState<NonNullable<DraftQuery["status"]>>("all");
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState<DraftCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [compatible, setCompatible] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
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
        const response = await queryDrafts(
          baseUrl,
          { type_id: type.id, search, status, page, page_size: 12 },
          csrfToken,
          { signal: abort.signal },
        );
        if (!abort.signal.aborted) {
          setCompatible(true);
          setError("");
          setResult(response.data);
          const last = Math.max(
            1,
            Math.ceil(response.data.total / response.data.page_size),
          );
          if (page > last) setPage(last);
        }
      } catch (reason) {
        if (!abort.signal.aborted) setError(draftError(reason));
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [baseUrl, csrfToken, type, search, status, page, revision]);
  const reset = () => {
    setLoading(true);
    setResult(null);
    setPage(1);
  };
  return {
    result,
    loading,
    error,
    compatible,
    search,
    status,
    page,
    setSearch: (value: string) => {
      setSearch(value);
      reset();
    },
    setStatus: (value: NonNullable<DraftQuery["status"]>) => {
      setStatus(value);
      reset();
    },
    setPage: (value: number) => {
      setPage(value);
      setLoading(true);
    },
    refresh: () => {
      setLoading(true);
      setRevision((value) => value + 1);
    },
  };
}
