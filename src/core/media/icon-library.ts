"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { queryIcons, uploadIcon } from "@/generated/settings-client";
import type { IconAsset, IconUpload } from "@/generated/settings-contract";
import { RequestError } from "@/core/http/request";
export function useIconLibrary() {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [items, setItems] = useState<IconAsset[]>([]);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [queryError, setQueryError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [uploadRetryable, setUploadRetryable] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [lastUploaded, setLastUploaded] = useState<IconAsset | null>(null);
  const pending = useRef<IconUpload | null>(null);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const result = await queryIcons(baseUrl, { query, page }, csrfToken, {
          signal: abort.signal,
        });
        if (!abort.signal.aborted) {
          setQueryError("");
          setItems(result.data.items);
          setTotal(result.data.total);
        }
      } catch {
        if (!abort.signal.aborted)
          setQueryError("上传图标暂时无法读取，内置图标仍可选择。");
      } finally {
        if (!abort.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      abort.abort();
    };
  }, [baseUrl, csrfToken, query, page, refresh]);
  const send = useCallback(
    async (payload: IconUpload) => {
      setUploading(true);
      setUploadError("");
      setUploadRetryable(false);
      try {
        const response = await uploadIcon(baseUrl, payload, csrfToken);
        if (mounted.current) {
          pending.current = null;
          setLastUploaded(response.data);
          setPage(1);
          setQuery("");
          setRefresh((value) => value + 1);
        }
      } catch (error) {
        if (mounted.current) {
          setUploadRetryable(
            !(error instanceof RequestError && error.status === 422),
          );
          if (error instanceof RequestError && error.status === 422)
            pending.current = null;
          setUploadError(
            error instanceof RequestError && error.status === 422
              ? "文件未通过校验。请使用 1 MB 内的静态 SVG、PNG、WebP；SVG 不含脚本、样式或外链。"
              : "尚未确认上传结果，可以重试；同一次上传不会重复入库。",
          );
        }
      } finally {
        if (mounted.current) setUploading(false);
      }
    },
    [baseUrl, csrfToken],
  );
  const upload = async (file: File) => {
    pending.current = null;
    setUploadRetryable(false);
    setLastUploaded(null);
    if (file.size > 1048576 || !/\.(svg|png|webp)$/i.test(file.name)) {
      setUploadError("请选择 1 MB 内的 SVG、PNG 或 WebP。");
      return;
    }
    setUploading(true);
    setUploadError("");
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (let start = 0; start < bytes.length; start += 8192)
        binary += String.fromCharCode(...bytes.subarray(start, start + 8192));
      pending.current = {
        filename: file.name,
        upload_id: crypto.randomUUID(),
        data_base64: btoa(binary),
      };
      await send(pending.current);
    } catch {
      if (mounted.current) {
        setUploadError("无法读取所选文件，请重新选择。");
        setUploading(false);
      }
    }
  };
  return {
    items,
    query,
    setQuery: (q: string) => {
      setQuery(q);
      setPage(1);
    },
    page,
    setPage,
    total,
    loading,
    uploading,
    error: uploadError || queryError,
    canRetry: Boolean(uploadRetryable || (!uploadError && queryError)),
    lastUploaded,
    upload,
    retry: () =>
      pending.current ? send(pending.current) : setRefresh((v) => v + 1),
  };
}
