"use client";
import { randomUUID } from "@/core/browser/crypto";
import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import { RequestError } from "@/core/http/request";
import { readMedia, updateMedia, editMedia } from "@/core/contracts/settings";
import type {
  ImageRecipe,
  MediaDetails,
  MediaEdit,
  MediaMetadata,
} from "@/core/contracts/settings";
/** Details and writes stay in the request layer; themes only render their state. */
export function useMediaAttachment(id: string) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [detail, setDetail] = useState<MediaDetails | null>(null);
  const [draft, setDraft] = useState<MediaMetadata | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [revision, setRevision] = useState(0);
  const mounted = useRef(true);
  const pendingEdit = useRef<MediaEdit | null>(null);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const abort = new AbortController();
    readMedia(baseUrl, { id }, csrfToken, { signal: abort.signal })
      .then(({ data }) => {
        if (!abort.signal.aborted) {
          setDetail(data);
          setDraft(data.metadata);
          setError("");
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setError("无法读取附件详情，请重试。");
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, baseUrl, csrfToken, revision]);
  const fail = (error: unknown) => {
    setError(
      error instanceof RequestError && error.status === 409
        ? "这份资料已被其他窗口修改。请先重新读取，再合并你的修改。"
        : error instanceof RequestError &&
            [413, 415, 422].includes(error.status ?? 0)
          ? "图片处理未通过校验，请检查裁剪范围与尺寸。"
          : "尚未确认保存结果，请重试。你的输入仍保留在这里。",
    );
  };
  const save = async () => {
    if (!detail || !draft || busy) return null;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await updateMedia(
        baseUrl,
        { id, expected_revision: detail.revision, metadata: draft },
        csrfToken,
      );
      if (mounted.current) {
        setDetail(data);
        setDraft(data.metadata);
        setNotice("资料已保存");
      }
      return data;
    } catch (error) {
      if (mounted.current) fail(error);
      return null;
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  const edit = async (recipe: ImageRecipe) => {
    if (busy) return null;
    if (
      !pendingEdit.current ||
      JSON.stringify(pendingEdit.current.recipe) !== JSON.stringify(recipe)
    )
      pendingEdit.current = { id, recipe, edit_id: randomUUID() };
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { data } = await editMedia(
        baseUrl,
        pendingEdit.current,
        csrfToken,
        { timeoutMs: 120000 },
      );
      pendingEdit.current = null;
      return data;
    } catch (error) {
      if (mounted.current) fail(error);
      return null;
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return {
    detail,
    draft,
    setDraft,
    loading,
    busy,
    error,
    notice,
    save,
    edit,
    dirty: Boolean(
      detail &&
      draft &&
      JSON.stringify(detail.metadata) !== JSON.stringify(draft),
    ),
    reload: () => {
      setLoading(true);
      setRevision((n) => n + 1);
    },
  };
}
