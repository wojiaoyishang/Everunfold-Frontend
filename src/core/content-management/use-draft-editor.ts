"use client";
import { useEffect, useRef, useState } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  DraftSession,
  type CollaborationStatus,
} from "@/core/collaboration/session";
import { commitCollaborationDraft } from "@/generated/collaboration-client";
import type { CommitDraft } from "@/generated/collaboration-contract";
import { rememberRecovery } from "@/core/collaboration/recovery";
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
  | { action: "collaboration"; input: CommitDraft }
  | { action: "create"; input: DraftCreate }
  | { action: "save" | "publish"; input: DraftSave }
  | { action: "withdraw"; input: DraftMutation };
export function useDraftEditor(type: ContentTypeDefinition, id: string | null) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const account = useAdminAccount();
  const sessionRef = useRef<DraftSession | null>(null);
  const [session, setSession] = useState<DraftSession | null>(null);
  const [collaboration, setCollaboration] =
    useState<CollaborationStatus | null>(null);
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [fields, setFields] = useState<DraftFields>(() => draftFields());
  const privateFields = useRef(fields);
  const [baseline, setBaseline] = useState(() => JSON.stringify(fields));
  const [loading, setLoading] = useState(id !== null);
  const [busy, setBusy] = useState(false);
  const inFlight = useRef(false);
  const preparing = useRef(false);
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
    privateFields.current = next;
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
    let owner: DraftSession | null = null;
    void readDraft(baseUrl, { id }, csrfToken, { signal: abort.signal })
      .then((response) => {
        if (!abort.signal.aborted) {
          if (response.data.type_id !== type.id)
            throw new RequestError("invalid");
          apply(response.data);
          setError("");
          if (response.data.status !== "trash") {
            owner = new DraftSession(baseUrl, csrfToken, id, account.id);
            sessionRef.current = owner;
            setSession(owner);
            const active = owner;
            active.onChange = () => {
              if (abort.signal.aborted) return;
              setCollaboration({ ...active.state });
              if (active.state.ready) {
                const restored = active.project(privateFields.current);
                setFields(restored);
                rememberRecovery(
                  account.id,
                  window.location.pathname,
                  id,
                  restored,
                  active.removedBlocks(restored),
                );
              }
            };
            void active.start();
          }
        }
      })
      .catch((reason) => {
        if (!abort.signal.aborted) setError(draftError(reason));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => {
      abort.abort();
      if (owner) {
        owner.onChange = () => {};
        void owner.dispose();
      }
      if (sessionRef.current === owner) sessionRef.current = null;
    };
  }, [id, type.id, baseUrl, csrfToken, readAttempt, account.id]);
  const dirty = JSON.stringify(fields) !== baseline;
  useEffect(() => {
    if (!dirty && !uncertain && !busy && !collaboration?.pending) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty, uncertain, busy, collaboration?.pending]);
  const save = async (action: "save" | "publish" | "withdraw" = "save") => {
    if (inFlight.current || preparing.current || conflict) return null;
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
      else if (sessionRef.current) {
        preparing.current = true;
        setBusy(true);
        try {
          const current = sessionRef.current;
          const committed = await current.cutoff();
          operation.current = {
            action: "collaboration",
            input: {
              id: detail.id,
              operation_id: crypto.randomUUID(),
              expected_revision: detail.revision,
              epoch: current.epoch,
              committed_seq: committed,
              action,
              visibility: fields.settings?.visibility ?? "public",
              opens_at: fields.settings?.opens_at ?? null,
              access_password: fields.access_password ?? null,
            },
          };
        } catch (reason) {
          setBusy(false);
          setError(
            reason instanceof Error ? reason.message : "请等待同步后重试。",
          );
          return null;
        } finally {
          preparing.current = false;
        }
      } else {
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
        request.action === "collaboration"
          ? {
              data: (
                await commitCollaborationDraft(
                  baseUrl,
                  request.input,
                  csrfToken,
                )
              ).data.draft,
            }
          : request.action === "create"
            ? await createDraft(baseUrl, request.input, csrfToken)
            : request.action === "withdraw"
              ? await withdrawDraft(baseUrl, request.input, csrfToken)
              : request.action === "publish"
                ? await publishDraft(baseUrl, request.input, csrfToken)
                : await saveDraft(baseUrl, request.input, csrfToken);
      if (mounted.current) {
        if (request.action === "collaboration" && sessionRef.current) {
          const saved = draftFields(response.data);
          setBaseline(JSON.stringify(saved));
          privateFields.current = saved;
          setDetail(response.data);
          setFields(sessionRef.current.project(saved));
          rememberRecovery(
            account.id,
            window.location.pathname,
            detail!.id,
            sessionRef.current.project(saved),
            sessionRef.current.removedBlocks(sessionRef.current.project(saved)),
          );
        } else apply(response.data);
        setUncertain(false);
        setNotice(
          (request.action === "collaboration"
            ? request.input.action
            : request.action) === "publish"
            ? "内容已发布"
            : (request.action === "collaboration"
                  ? request.input.action
                  : request.action) === "withdraw"
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
    session,
    collaboration,
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
        privateFields.current = next;
        if (sessionRef.current?.state.ready) {
          if (
            JSON.stringify(fields.body.map((b) => [b.id, b.type])) !==
            JSON.stringify(next.body.map((b) => [b.id, b.type]))
          )
            sessionRef.current.undo.stopCapturing();
          sessionRef.current.setFields(next, fields);
          setFields(sessionRef.current.project(next));
          rememberRecovery(
            account.id,
            window.location.pathname,
            sessionRef.current.id,
            sessionRef.current.project(next),
            sessionRef.current.removedBlocks(sessionRef.current.project(next)),
          );
        } else setFields(next);
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
        if (sessionRef.current?.state.ready) {
          const saved = draftFields(latest);
          privateFields.current = saved;
          setDetail(latest);
          setBaseline(JSON.stringify(saved));
          setFields(sessionRef.current.project(saved));
        } else apply(latest);
        setConflict(false);
        setLatest(null);
        setError("");
      }
    },
  };
}
