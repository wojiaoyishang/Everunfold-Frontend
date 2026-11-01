"use client";
import { useEffect, useRef, useState } from "react";
import { useAdminRequest } from "@/core/admin/account-context";
import {
  createDraft,
  readDraft,
  saveDraft,
  publishDraft,
  withdrawDraft,
} from "@/generated/content-admin-client";
import type {
  ContentTypeDefinition,
  DraftDetail,
  DraftFields,
  DraftCreate,
  DraftSave,
  DraftMutation,
} from "@/generated/content-admin-contract";
import { RequestError } from "@/core/http/request";
import {
  draftError,
  draftFields,
  uncertainWrite,
  validateDraft,
} from "./draft-state";

type Write =
  | { action: "create"; input: DraftCreate }
  | { action: "save" | "publish"; input: DraftSave }
  | { action: "withdraw"; input: DraftMutation };
export function useDraftEditor(type: ContentTypeDefinition, id: string | null) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [fields, setFields] = useState<DraftFields>(() => draftFields());
  const [baseline, setBaseline] = useState(() => JSON.stringify(fields));
  const [loading, setLoading] = useState(id !== null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [conflict, setConflict] = useState(false);
  const [latest, setLatest] = useState<DraftDetail | null>(null);
  const [uncertain, setUncertain] = useState(false);
  const [readAttempt, setReadAttempt] = useState(0);
  const operation = useRef<Write | null>(null);
  const apply = (value: DraftDetail) => {
    const next = draftFields(value);
    setBaseline(JSON.stringify(next));
    setFields(next);
    setDetail(value);
  };
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (!id) return;
    const abort = new AbortController();
    void readDraft(baseUrl, { id }, csrfToken, { signal: abort.signal })
      .then((response) => {
        if (!abort.signal.aborted) {
          if (response.data.type_id !== type.id)
            throw new RequestError("invalid");
          apply(response.data);
          setError("");
        }
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(draftError(reason));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, [id, type.id, baseUrl, csrfToken, readAttempt]);
  const dirty = JSON.stringify(fields) !== baseline;
  useEffect(() => {
    if (!dirty && !uncertain && !busy) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain, busy]);
  const save = async (action: "save" | "publish" | "withdraw" = "save") => {
    if (inFlight.current || conflict) return null;
    const invalid = validateDraft(fields, type);
    if (invalid) {
      setError(invalid);
      return null;
    }
    if (!operation.current) {
      if (!detail)
        operation.current = {
          action: "create",
          input: {
            type_id: type.id,
            operation_id: crypto.randomUUID(),
            fields,
          },
        };
      else {
        const mutation = {
          id: detail.id,
          operation_id: crypto.randomUUID(),
          expected_revision: detail.revision,
        };
        operation.current =
          action === "withdraw"
            ? { action, input: mutation }
            : { action, input: { ...mutation, fields } };
      }
    }
    inFlight.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const request = operation.current;
      const response =
        request.action === "create"
          ? await createDraft(baseUrl, request.input, csrfToken)
          : request.action === "withdraw"
            ? await withdrawDraft(baseUrl, request.input, csrfToken)
            : request.action === "publish"
              ? await publishDraft(baseUrl, request.input, csrfToken)
              : await saveDraft(baseUrl, request.input, csrfToken);
      if (mounted.current) {
        apply(response.data);
        setUncertain(false);
        setNotice(
          request.action === "publish"
            ? "内容已发布"
            : request.action === "withdraw"
              ? "内容已撤回"
              : "草稿已保存",
        );
      }
      operation.current = null;
      return mounted.current ? response.data : null;
    } catch (reason) {
      if (mounted.current) {
        const unknown = uncertainWrite(reason);
        setUncertain(unknown);
        if (!unknown) operation.current = null;
        setConflict(reason instanceof RequestError && reason.code === 40951);
        setError(
          unknown
            ? "保存结果尚未确认，输入已保留。请重试确认后继续编辑。"
            : draftError(reason),
        );
      }
      return null;
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  return {
    detail,
    fields,
    loading,
    busy,
    dirty,
    error,
    notice,
    conflict,
    latest,
    uncertain,
    save,
    setFields: (next: DraftFields) => {
      if (!inFlight.current && !uncertain) {
        setFields(next);
        setNotice("");
      }
    },
    retryRead: () => {
      setLoading(true);
      setReadAttempt((value) => value + 1);
    },
    readLatest: async () => {
      if (!detail || inFlight.current) return;
      inFlight.current = true;
      setBusy(true);
      try {
        const response = await readDraft(baseUrl, { id: detail.id }, csrfToken);
        if (mounted.current) setLatest(response.data);
      } catch (reason) {
        if (mounted.current) setError(draftError(reason));
      } finally {
        inFlight.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    acceptLatest: () => {
      if (latest) {
        apply(latest);
        setConflict(false);
        setLatest(null);
        setError("");
      }
    },
  };
}
