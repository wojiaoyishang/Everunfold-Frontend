"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "@/core/browser/crypto";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import type { DraftSession } from "@/core/collaboration/session";
import {
  deleteLocalBranch,
  listLocalBranches,
  newLocalBranch,
  privateDraftFields,
  writeLocalBranch,
  type LocalBranch,
  branchTimestamp,
} from "@/core/collaboration/branches";
import type { DraftFields } from "@/core/contracts/content-admin";
import type {
  BranchDetail,
  ConflictResolution,
  MergeDetail,
  VersionCatalog,
  VersionDetail,
} from "@/core/contracts/collaboration";
import {
  beginDraftMerge,
  cancelDraftMerge,
  deleteDraftBranch,
  deleteDraftMerge,
  deleteDraftVersion,
  finishDraftMerge,
  listDraftVersions,
  readDraftBranch,
  readDraftMerge,
  readDraftVersion,
  renewDraftMerge,
  resolveDraftMerge,
  uploadDraftBranch,
} from "@/core/contracts/collaboration";
import { draftError } from "./draft-state";
import { RequestError } from "@/core/http/request";
import { useVersionTarget } from "./use-version-target";
import {
  renewedMerge,
  resumedDecisions,
  sameMergeTarget,
} from "./merge-resume";

export type VersionSelection = {
  kind: "version" | "branch" | "local" | "merge";
  id: string;
};
export type DraftVersioning = ReturnType<typeof useDraftVersions>;

/** Owns all history/branch requests; theme components only render and select actions. */
export function useDraftVersions(
  session: DraftSession,
  selection?: VersionSelection | null,
  targetRevision: number | null = null,
) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const account = useAdminAccount();
  const [catalog, setCatalog] = useState<VersionCatalog | null>(null);
  const [local, setLocal] = useState<LocalBranch[]>([]);
  const [version, setVersion] = useState<VersionDetail | null>(null);
  const target = useVersionTarget(session.id, targetRevision);
  const [lookupAttempt, retryLookup] = useState(0);
  const [branch, setBranch] = useState<BranchDetail | null>(null);
  const [merge, setMerge] = useState<MergeDetail | null>(null);
  const [result, setResult] = useState<DraftFields | null>(null);
  const resultRef = useRef<DraftFields | null>(null);
  const mergeRef = useRef<MergeDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSaved, setLocalSaved] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pages, setPages] = useState({
    page: 1,
    branch_page: 1,
    merge_page: 1,
  });
  const mounted = useRef(true),
    working = useRef(false);
  const beginIds = useRef(new Map<string, string>());
  const cacheWrites = useRef(0);
  const loadedSelection = useRef("");
  const lookup = { id: session.id };
  const run = async <T>(work: () => Promise<T>) => {
    if (working.current) return null;
    working.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      return await work();
    } catch (cause) {
      if (mounted.current) setError(draftError(cause));
      return null;
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const refresh = useCallback(async () => {
    try {
      const [response, entries] = await Promise.allSettled([
        listDraftVersions(baseUrl, { id: session.id, ...pages }, csrfToken),
        listLocalBranches(session.scope),
      ]);
      if (!mounted.current) return;
      if (response.status === "fulfilled") setCatalog(response.value.data);
      else setError(draftError(response.reason));
      if (entries.status === "fulfilled") setLocal(entries.value);
      else setError("无法读取本机草稿，请保留页面并导出内容。");
    } catch (cause) {
      if (mounted.current) setError(draftError(cause));
    }
  }, [baseUrl, csrfToken, session, pages]);
  useEffect(() => {
    mounted.current = true;
    void Promise.resolve().then(refresh);
    const poll = setInterval(() => void refresh(), 6000);
    return () => {
      mounted.current = false;
      clearInterval(poll);
    };
  }, [refresh]);
  const acceptMerge = (value: MergeDetail, replaceResult = true) => {
    mergeRef.current = value;
    setMerge(value);
    if (replaceResult) {
      resultRef.current = value.result;
      setResult(value.result);
    }
    setVersion(null);
    setBranch(null);
  };
  const begin = async (branchId: string) => {
    const mergeId = beginIds.current.get(branchId) ?? randomUUID();
    beginIds.current.set(branchId, mergeId);
    const { data } = await beginDraftMerge(
      baseUrl,
      { ...lookup, branch_id: branchId, merge_id: mergeId },
      csrfToken,
    );
    if (data.status !== "active") beginIds.current.delete(branchId);
    acceptMerge(data);
    await refresh();
    return data.id;
  };
  const cacheResult = useCallback(
    async (fields: DraftFields, current: MergeDetail) => {
      const generation = ++cacheWrites.current;
      setLocalSaved(false);
      try {
        await writeLocalBranch({
          id: current.id,
          scope: session.scope,
          updatedAt: branchTimestamp(),
          payload: {
            id: session.id,
            branch_id: current.id,
            note: "合并结果恢复草稿",
            base_epoch: current.epoch,
            base_seq: current.target_seq,
            base_revision: current.target_revision,
            fields: privateDraftFields(fields),
            updates: [],
          },
        });
        if (mounted.current && cacheWrites.current === generation)
          setLocalSaved(true);
      } catch {
        if (mounted.current && cacheWrites.current === generation) {
          setLocalSaved(false);
          setError("合并结果在本机保存失败，请导出后继续。");
        }
      }
    },
    [session],
  );
  const replaceResult = (fields: DraftFields) => {
    resultRef.current = fields;
    setResult(fields);
    if (mergeRef.current) void cacheResult(fields, mergeRef.current);
  };
  useEffect(() => {
    if (
      !merge ||
      merge.status !== "active" ||
      merge.owner_id !== account.id ||
      !result ||
      JSON.stringify(result) === JSON.stringify(merge.result)
    )
      return;
    const timer = setTimeout(() => {
      if (working.current || !mergeRef.current || !resultRef.current) return;
      const sent = resultRef.current,
        current = mergeRef.current;
      working.current = true;
      setSaving(true);
      void resolveDraftMerge(
        baseUrl,
        { ...lookup, merge_id: current.id, resolutions: [], result: sent },
        csrfToken,
      )
        .then(({ data }) => {
          if (mounted.current) {
            mergeRef.current = data;
            setMerge(data);
            setError("");
          }
        })
        .catch((cause) => {
          if (mounted.current) setError(draftError(cause));
        })
        .finally(() => {
          working.current = false;
          if (mounted.current) setSaving(false);
        });
    }, 600);
    return () => clearTimeout(timer);
    // The stable request context is captured with the active merge and draft.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [merge, result, account.id, baseUrl, csrfToken, busy, saving]);
  const mergeId = merge?.id,
    mergeStatus = merge?.status,
    mergeOwner = merge?.owner_id;
  useEffect(() => {
    if (!mergeId || mergeStatus !== "active" || mergeOwner !== account.id)
      return;
    const timer = setInterval(() => {
      void renewDraftMerge(
        baseUrl,
        { id: session.id, merge_id: mergeId },
        csrfToken,
      )
        .then(({ data }) => {
          if (mounted.current) {
            const renewed = renewedMerge(mergeRef.current, data);
            mergeRef.current = renewed;
            setMerge(renewed);
          }
        })
        .catch((cause) => {
          const current = mergeRef.current;
          if (
            !mounted.current ||
            current?.id !== mergeId ||
            current.status !== "active"
          )
            return;
          setError(draftError(cause));
          if (Date.parse(current.expires_at) < Date.now()) {
            const expired = { ...current, status: "expired" as const };
            mergeRef.current = expired;
            setMerge(expired);
          }
        });
    }, 15000);
    return () => clearInterval(timer);
  }, [
    mergeId,
    mergeStatus,
    mergeOwner,
    account.id,
    baseUrl,
    csrfToken,
    session.id,
  ]);
  const selectionKey = selection
    ? `${selection.kind}:${selection.id}:${lookupAttempt}`
    : "";
  useEffect(() => {
    if (loadedSelection.current === selectionKey || working.current) return;
    loadedSelection.current = selectionKey;
    if (!selection || selection.kind === "local") return;
    if (selection.kind === "version" && selection.id === "head") return;
    if (selection.kind === "merge" && mergeRef.current?.id === selection.id)
      return;
    void run(async () => {
      if (selection.kind === "version") {
        const { data } = await readDraftVersion(
          baseUrl,
          { ...lookup, revision: Number(selection.id) },
          csrfToken,
        );
        setVersion(data);
        setBranch(null);
      } else if (selection.kind === "branch") {
        const { data } = await readDraftBranch(
          baseUrl,
          { ...lookup, branch_id: selection.id },
          csrfToken,
        );
        setBranch(data);
        setVersion(null);
      } else {
        const { data } = await readDraftMerge(
          baseUrl,
          { ...lookup, merge_id: selection.id },
          csrfToken,
        );
        acceptMerge(data);
      }
    });
    // Read each URL selection once; ordinary presence and catalog updates do not reset the view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey, busy]);
  const cancel = () =>
    run(async () => {
      const current = mergeRef.current;
      if (!current || current.status !== "active") return true;
      if (resultRef.current) {
        await cacheResult(resultRef.current, current);
        try {
          await resolveDraftMerge(
            baseUrl,
            {
              ...lookup,
              merge_id: current.id,
              resolutions: [],
              result: resultRef.current,
            },
            csrfToken,
          );
        } catch (cause) {
          if (!(cause instanceof RequestError) || cause.code !== 40984)
            throw cause;
          const { data } = await readDraftMerge(
            baseUrl,
            { ...lookup, merge_id: current.id },
            csrfToken,
          );
          acceptMerge(data, false);
          await refresh();
          return true;
        }
      }
      const { data } = await cancelDraftMerge(
        baseUrl,
        { ...lookup, merge_id: current.id },
        csrfToken,
      );
      acceptMerge(data, false);
      beginIds.current.delete(current.branch_id);
      await refresh();
      return true;
    });
  return {
    accountId: account.id,
    catalog,
    local,
    version,
    target: target.detail,
    targetLoading: target.loading,
    targetError: target.error,
    branch,
    merge,
    result,
    busy,
    saving,
    localSaved,
    serverSaved: JSON.stringify(result) === JSON.stringify(merge?.result),
    error,
    notice,
    pages,
    setPages,
    refresh,
    canResolve: Boolean(
      merge?.status === "active" && merge.owner_id === account.id,
    ),
    retryRead: () => {
      retryLookup((value) => value + 1);
      target.retry();
      void refresh();
    },
    fromVersion: (item: VersionDetail) => {
      session.detachFields(item.fields, `从 V${item.version.revision} 继续`, {
        base_revision: item.version.revision,
        base_epoch: null,
        base_seq: null,
      });
    },
    editLocal: (item: LocalBranch) => session.openBranch(item),
    editBranch: (item: BranchDetail) =>
      session.openBranch(
        newLocalBranch(session.scope, {
          ...lookup,
          base_branch_id: item.branch.id,
          fields: item.fields,
          note: item.branch.note,
          updates: [],
        }),
      ),
    deleteVersion: (revision: number) =>
      run(async () => {
        await deleteDraftVersion(baseUrl, { ...lookup, revision }, csrfToken);
        setVersion(null);
        await refresh();
        return true;
      }),
    deleteBranch: (branchId: string) =>
      run(async () => {
        await deleteDraftBranch(
          baseUrl,
          { ...lookup, branch_id: branchId },
          csrfToken,
        );
        setBranch(null);
        await refresh();
        return true;
      }),
    deleteLocal: (branchId: string) =>
      run(async () => {
        if (session.currentBranch?.id === branchId)
          throw new Error("请先返回最新版，再删除当前本地草稿。");
        await deleteLocalBranch(session.scope, branchId);
        await refresh();
        return true;
      }),
    deleteMerge: (mergeId: string) =>
      run(async () => {
        await deleteDraftMerge(
          baseUrl,
          { ...lookup, merge_id: mergeId },
          csrfToken,
        );
        if (merge?.id === mergeId) {
          mergeRef.current = null;
          setMerge(null);
        }
        await refresh();
        return true;
      }),
    startBranchMerge: (branchId: string) => run(() => begin(branchId)),
    startLocalMerge: (item?: LocalBranch) =>
      run(async () => {
        const payload =
          item && item.id !== session.currentBranch?.id
            ? item.payload
            : await session.branchForMerge();
        const response = await uploadDraftBranch(baseUrl, payload, csrfToken);
        if (session.currentBranch?.id === payload.branch_id)
          await session.markBranchUploaded();
        return begin(response.data.branch.id);
      }),
    resumeResult: () =>
      run(async () => {
        if (!mergeRef.current || !resultRef.current) return false;
        const previous = mergeRef.current,
          savedResult = resultRef.current;
        await cacheResult(savedResult, previous);
        beginIds.current.delete(previous.branch_id);
        // Restart the original input branch so unresolved choices cannot disappear.
        const id = await begin(previous.branch_id);
        const current = mergeRef.current!;
        if (sameMergeTarget(previous, current)) {
          const { data } = await resolveDraftMerge(
            baseUrl,
            {
              ...lookup,
              merge_id: id,
              result: savedResult,
              resolutions: resumedDecisions(previous, current, savedResult),
            },
            csrfToken,
          );
          acceptMerge(data);
          await cacheResult(data.result, data);
        } else {
          setNotice(
            "最新版已有新修改，已重新比较原分支。上次合并结果保留在合并记录和本机恢复草稿中，可对照取用。",
          );
        }
        return id;
      }),
    setResult: replaceResult,
    resolve: (resolution: ConflictResolution) =>
      run(async () => {
        const current = mergeRef.current;
        if (!current) return false;
        const { data } = await resolveDraftMerge(
          baseUrl,
          {
            ...lookup,
            merge_id: current.id,
            resolutions: [resolution],
            result: resultRef.current,
          },
          csrfToken,
        );
        acceptMerge(data);
        await cacheResult(data.result, data);
        return true;
      }),
    cancel,
    finish: () =>
      run(async () => {
        const current = mergeRef.current;
        if (!current || !resultRef.current) return false;
        await cacheResult(resultRef.current, current);
        const prior = await readDraftMerge(
          baseUrl,
          { ...lookup, merge_id: current.id },
          csrfToken,
        );
        if (prior.data.status === "completed") {
          acceptMerge(prior.data);
          await refresh();
          if (prior.data.result_revision)
            await session.followMergedHead(prior.data.result_revision);
          return true;
        }
        await resolveDraftMerge(
          baseUrl,
          {
            ...lookup,
            merge_id: current.id,
            resolutions: [],
            result: resultRef.current,
          },
          csrfToken,
        );
        const { data } = await finishDraftMerge(
          baseUrl,
          { ...lookup, merge_id: current.id },
          csrfToken,
        );
        acceptMerge(data);
        await deleteLocalBranch(session.scope, current.id);
        await refresh();
        if (data.result_revision)
          await session.followMergedHead(data.result_revision);
        return true;
      }),
  };
}
