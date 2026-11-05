"use client";
import { randomUUID } from "@/core/browser/crypto";
import { commandBody, type BlockCommand } from "@/core/editor/block-commands";
import { useEffect, useRef, useState } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import {
  DraftSession,
  type CollaborationStatus,
} from "@/core/collaboration/session";
import { commitCollaborationDraft } from "@/generated/collaboration-client";
import type { CommitDraft } from "@/generated/collaboration-contract";
import {
  rememberRecovery,
  recoveryForPage,
  recoverySnapshot,
} from "@/core/collaboration/recovery";
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
import {
  blockSourcePatches,
  readBlockSources,
  withBlockSources,
  type BufferedSources,
} from "./block-sources";
import { RequestError } from "@/core/http/request";
import { hasPrivateDraftChanges } from "./draft-revision";
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
export function useDraftEditor(
  type: ContentTypeDefinition,
  id: string | null,
  language: "zh-CN" | "en" = "zh-CN",
) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const account = useAdminAccount();
  const sessionRef = useRef<DraftSession | null>(null);
  const [session, setSession] = useState<DraftSession | null>(null);
  const [collaboration, setCollaboration] =
    useState<CollaborationStatus | null>(null);
  const [detail, setDetail] = useState<DraftDetail | null>(null);
  const [fields, setFields] = useState<DraftFields>(() => draftFields());
  const privateFields = useRef(fields);
  const currentDetail = useRef<DraftDetail | null>(null);
  const pendingRevision = useRef(0);
  const conflictCode = useRef<number | null>(null);
  const sourceKey = id
    ? `everunfold-block-sources:${baseUrl}:${account.id}:${id}`
    : null;
  const [sources, setSources] = useState<BufferedSources>({});
  const sourceRef = useRef<BufferedSources>({});
  const receivedSave = useRef<{ seq: number; sources: BufferedSources } | null>(
    null,
  );
  const [awaitingSources, setAwaitingSources] = useState(false);
  const [storageError, setStorageError] = useState("");
  const keepSources = (value: BufferedSources) => {
    sourceRef.current = value;
    setSources(value);
    if (!sourceKey) return;
    try {
      if (Object.keys(value).length)
        sessionStorage.setItem(sourceKey, JSON.stringify(value));
      else sessionStorage.removeItem(sourceKey);
      setStorageError("");
    } catch {
      setStorageError("浏览器无法备份正文修改，离开前请保存或导出。");
    }
  };
  const recover = (active: DraftSession, shared: DraftFields) => {
    const removed = active.removedBlocks(shared);
    const hidden = Object.entries(sourceRef.current)
      .filter(([blockId]) => !shared.body.some((block) => block.id === blockId))
      .map(([id, source]) => ({
        id,
        type: source.type,
        content: source.content,
      }));
    rememberRecovery(
      account.id,
      window.location.pathname,
      active.id,
      withBlockSources(shared, sourceRef.current),
      [
        ...removed.filter((block) => !hidden.some(({ id }) => id === block.id)),
        ...hidden,
      ],
      Object.fromEntries(active.sources.drafts),
    );
  };
  const confirmSources = (seq: number) => {
    const saved = receivedSave.current;
    if (!saved || seq < saved.seq) return;
    receivedSave.current = null;
    setAwaitingSources(false);
    const next = { ...sourceRef.current };
    for (const [id, part] of Object.entries(saved.sources))
      if (next[id]?.content === part.content) delete next[id];
    keepSources(next);
  };
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
    currentDetail.current = value;
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
          if (sourceKey) {
            const restored = readBlockSources(sourceKey);
            sourceRef.current = restored;
            setSources(restored);
          }
          setError("");
          if (response.data.status !== "trash") {
            owner = new DraftSession(
              baseUrl,
              csrfToken,
              id,
              account.id,
              draftFields(response.data),
            );
            sessionRef.current = owner;
            setSession(owner);
            const active = owner;
            active.onRevision = (revision) => {
              pendingRevision.current = Math.max(
                pendingRevision.current,
                revision,
              );
              if (revision <= (currentDetail.current?.revision ?? 0)) return;
              if (inFlight.current || preparing.current) return;
              void readDraft(baseUrl, { id }, csrfToken, {
                signal: abort.signal,
              })
                .then(({ data }) => {
                  const prior = currentDetail.current;
                  if (
                    abort.signal.aborted ||
                    !prior ||
                    data.revision !== revision ||
                    data.revision <= prior.revision ||
                    inFlight.current ||
                    preparing.current
                  )
                    return;
                  const local = privateFields.current;
                  // Private access changes are not CRDT fields. A newer save must
                  // never silently replace a locally edited password or access rule.
                  if (hasPrivateDraftChanges(local, prior)) {
                    conflictCode.current = 40951;
                    setConflict(true);
                    setError(
                      "访问设置已有新版本。你的输入已保留，请先查看最新内容。",
                    );
                    return;
                  }
                  const saved = draftFields(data);
                  currentDetail.current = data;
                  setDetail(data);
                  setBaseline(JSON.stringify(saved));
                  privateFields.current = active.project(saved);
                  setFields(privateFields.current);
                  if (conflictCode.current === 40951) {
                    conflictCode.current = null;
                    setConflict(false);
                    setError("");
                  }
                })
                .catch(() => {
                  /* A failed refresh leaves the original revision guard in place. */
                });
            };
            let documentVersion = -1;
            active.onChange = () => {
              if (abort.signal.aborted) return;
              setCollaboration({ ...active.state });
              if (documentVersion === active.state.documentVersion) return;
              documentVersion = active.state.documentVersion;
              if (active.state.ready) {
                const restored = active.project(privateFields.current);
                if (
                  Object.keys(sourceRef.current).length &&
                  active.state.mode === "shared"
                ) {
                  active.detachFields(
                    withBlockSources(restored, sourceRef.current),
                    "旧编辑器未保存正文",
                  );
                  keepSources({});
                  return;
                }
                setFields(restored);
                confirmSources(active.state.seq);
                const local = sourceRef.current;
                const matched = restored.body.filter((block) => {
                  const pending = local[block.id];
                  return (
                    pending &&
                    pending.content === block.content &&
                    pending.type === block.type
                  );
                });
                if (matched.length) {
                  const next = { ...local };
                  for (const block of matched) delete next[block.id];
                  keepSources(next);
                }
                recover(active, restored);
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
        owner.onRevision = () => {};
        void owner.dispose();
      }
      if (sessionRef.current === owner) sessionRef.current = null;
    };
    // The effect owns one authorized draft session and its stable storage key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, type.id, baseUrl, csrfToken, readAttempt, account.id, sourceKey]);
  const displayed = withBlockSources(fields, sources);
  const dirty =
    JSON.stringify(displayed) !== baseline ||
    Object.keys(sources).some(
      (key) =>
        !sources[key].locallyRemoved &&
        !fields.body.some((block) => block.id === key),
    );
  useEffect(() => {
    if (
      !(detail ? hasPrivateDraftChanges(displayed, detail) : dirty) &&
      !uncertain &&
      !busy &&
      !collaboration?.pending &&
      !collaboration?.sourceStaged
    )
      return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [
    dirty,
    uncertain,
    busy,
    collaboration?.pending,
    collaboration?.sourceStaged,
    displayed,
    detail,
  ]);
  const save = async (
    action: "save" | "publish" | "withdraw" = "save",
    note = "",
  ) => {
    if (inFlight.current || preparing.current || conflict) return null;
    const invalid = validateDraft(displayed, type);
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
            language,
            operation_id: randomUUID(),
            fields: displayed,
          },
        };
      else if (sessionRef.current) {
        preparing.current = true;
        setBusy(true);
        try {
          const current = sessionRef.current;
          const committed = await current.cutoff();
          if (receivedSave.current)
            throw new Error("正在接收已保存的正文，请稍后重试。");
          const sharedIds = new Set(
            current
              .project(privateFields.current)
              .body.map((block) => block.id),
          );
          const block_sources =
            action === "withdraw"
              ? []
              : await blockSourcePatches(
                  Object.fromEntries(
                    Object.entries(sourceRef.current).filter(
                      ([id, entry]) =>
                        !entry.locallyRemoved || sharedIds.has(id),
                    ),
                  ),
                );
          operation.current = {
            action: "collaboration",
            input: {
              id: detail.id,
              operation_id: randomUUID(),
              expected_revision:
                currentDetail.current?.revision ?? detail.revision,
              epoch: current.epoch,
              committed_seq: committed,
              block_sources,
              action,
              note,
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
          operation_id: randomUUID(),
          expected_revision: detail.revision,
        };
        operation.current =
          action === "withdraw"
            ? { action, input: mutation }
            : { action, input: { ...mutation, fields: displayed } };
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
          ? await commitCollaborationDraft(
              baseUrl,
              request.input,
              csrfToken,
            ).then(({ data }) => {
              if (
                mounted.current &&
                request.input.action !== "withdraw" &&
                Object.keys(sourceRef.current).length
              ) {
                receivedSave.current = {
                  seq: data.committed_seq,
                  sources: sourceRef.current,
                };
                setAwaitingSources(true);
                confirmSources(sessionRef.current?.state.seq ?? -1);
              }
              return { data: data.draft };
            })
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
          currentDetail.current = response.data;
          setDetail(response.data);
          setFields(sessionRef.current.project(saved));
          recover(sessionRef.current, sessionRef.current.project(saved));
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
        setConflict(
          reason instanceof RequestError &&
            (reason.code === 40951 || reason.code === 40976),
        );
        conflictCode.current =
          reason instanceof RequestError ? (reason.code ?? null) : null;
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
      if (pendingRevision.current > (currentDetail.current?.revision ?? 0))
        sessionRef.current?.onRevision(pendingRevision.current);
    }
  };
  const setBlockContent = (
    blockId: string,
    content: string,
    previous: string,
  ) => {
    if (
      inFlight.current ||
      preparing.current ||
      uncertain ||
      receivedSave.current
    )
      return;
    const active = sessionRef.current;
    const shared = active?.state.ready
      ? active.project(privateFields.current)
      : privateFields.current;
    const block = shared.body.find(({ id }) => id === blockId);
    if (!block) return;
    if (active?.state.ready) {
      active.setSource(blockId, content, previous);
      recover(active, shared);
    } else {
      privateFields.current = {
        ...shared,
        body: shared.body.map((part) =>
          part.id === blockId ? { ...part, content } : part,
        ),
      };
      setFields(privateFields.current);
    }
    setNotice("");
  };
  return {
    detail,
    session,
    collaboration,
    fields: displayed,
    stagedBlocks: Object.keys(sources),
    awaitingSources,
    loading,
    busy,
    dirty,
    unsaved: detail
      ? Boolean(
          collaboration?.pending ||
          collaboration?.mode !== "shared" ||
          hasPrivateDraftChanges(displayed, detail),
        )
      : dirty,
    privateUnsaved: Boolean(
      detail && hasPrivateDraftChanges(displayed, detail),
    ),
    error: error || storageError,
    notice,
    conflict,
    latest,
    uncertain,
    save,
    commandBlock: (command: BlockCommand) => {
      if (inFlight.current || preparing.current || uncertain) return false;
      const active = sessionRef.current;
      if (active) {
        if (!active.commandBlock(privateFields.current, command)) return false;
        const next = active.project(privateFields.current);
        setFields(next);
        recover(active, next);
      } else {
        const body = commandBody(privateFields.current.body, command);
        if (!body) return false;
        privateFields.current = { ...privateFields.current, body };
        setFields(privateFields.current);
      }
      setNotice("");
      return true;
    },
    setBlockContent,
    transformBlockContent: (
      id: string,
      change: (block: DraftFields["body"][number]) => string,
    ) => {
      const active = sessionRef.current;
      const shared = active?.state.ready
        ? active.project(privateFields.current)
        : privateFields.current;
      const block = withBlockSources(shared, sourceRef.current).body.find(
        (part) => part.id === id,
      );
      if (block) setBlockContent(id, change(block), block.content);
    },
    setFields: (next: DraftFields) => {
      if (
        inFlight.current ||
        preparing.current ||
        uncertain ||
        receivedSave.current
      )
        return;
      const active = sessionRef.current;
      if (active?.state.ready) {
        if (!active.canEdit && active.state.mode === "shared") return;
        if (
          JSON.stringify(fields.body.map((b) => [b.id, b.type])) !==
          JSON.stringify(next.body.map((b) => [b.id, b.type]))
        )
          active.undo.stopCapturing();
        active.setFields(next, fields);
        privateFields.current = next;
        const current = active.project(next);
        setFields(current);
        recover(active, current);
      } else {
        privateFields.current = next;
        setFields(next);
      }
      setNotice("");
    },
    discardSources: () => keepSources({}),
    recoveryContent: () =>
      recoveryForPage(recoverySnapshot(), window.location.pathname, account.id)
        ?.content,
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
        keepSources({});
        if (sessionRef.current?.state.ready) {
          const saved = draftFields(latest);
          privateFields.current = saved;
          currentDetail.current = latest;
          setDetail(latest);
          setBaseline(JSON.stringify(saved));
          setFields(sessionRef.current.project(saved));
        } else apply(latest);
        setConflict(false);
        conflictCode.current = null;
        setLatest(null);
        setError("");
      }
    },
  };
}
