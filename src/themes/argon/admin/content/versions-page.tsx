"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type {
  ContentTypeDefinition,
  MediaURL,
} from "@/generated/content-admin-contract";
import type { MediaItem, PublicShortcode } from "@/generated/settings-contract";
import type { DraftSession } from "@/core/collaboration/session";
import { useDraftEditor } from "@/core/content-management/use-draft-editor";
import {
  useDraftVersions,
  type VersionSelection,
} from "@/core/content-management/use-draft-versions";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { useEditorNavigation } from "@/core/content-management/use-editor-navigation";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { serializeDraftExport } from "@/core/collaboration/export";
import {
  revisionReference,
  swapRevisionPair,
} from "@/core/content-management/revision-pair";
import { Button, TextField } from "../../components/ui/primitives";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { DownloadButton } from "../../components/ui/download-button";
import { CodePreferencesProvider } from "../../components/code-preferences";
import { Icon } from "../../components/icon";
import {
  VersionCatalog,
  type VersionDeletion,
  type VersionTab,
} from "./version-catalog";
import { VersionComparison } from "./version-comparison";
import { VersionMergeWorkspace } from "./version-merge-workspace";
import { VersionPairPicker } from "./version-pair-picker";
import styles from "./versions.module.css";

export function DraftVersionsPage({
  type,
  id,
}: {
  type: ContentTypeDefinition;
  id: string;
}) {
  const editor = useDraftEditor(type, id);
  const resources = useEditorResources();
  const shortcodes = useAppliedShortcodes();
  return (
    <CodePreferencesProvider value={resources.codePreferences}>
      {editor.session ? (
        <VersionsWorkspace
          session={editor.session}
          type={type}
          media={{
            ...resources.media,
            ...editor.detail?.media_urls,
            ...editor.session.mediaUrls,
          }}
          shortcodes={shortcodes}
          onMedia={resources.remember}
          onCheckpoint={async (note) =>
            Boolean(await editor.save("save", note))
          }
          saveError={editor.error}
        />
      ) : (
        <div className={styles.page}>
          <h1>版本修订</h1>
          <p role={editor.error ? "alert" : "status"}>
            {editor.error || "正在读取文章…"}
          </p>
          {editor.error && (
            <Button className="admin-button" onClick={editor.retryRead}>
              重新读取
            </Button>
          )}
        </div>
      )}
    </CodePreferencesProvider>
  );
}

function VersionsWorkspace({
  session,
  type,
  media,
  shortcodes,
  onCheckpoint,
  saveError,
  onMedia,
}: {
  session: DraftSession;
  type: ContentTypeDefinition;
  media: Record<string, MediaURL>;
  shortcodes: readonly PublicShortcode[];
  onCheckpoint: (note: string) => Promise<boolean>;
  saveError: string;
  onMedia: (item: MediaItem) => void;
}) {
  const router = useRouter(),
    search = useSearchParams();
  const kind = search.get("view"),
    selectedId = search.get("selected");
  const selection: VersionSelection | null =
    selectedId && ["version", "branch", "local", "merge"].includes(kind ?? "")
      ? { kind: kind as VersionSelection["kind"], id: selectedId }
      : null;
  const targetValue = revisionReference(search.get("compare"));
  const versioning = useDraftVersions(
    session,
    selection,
    targetValue === "head" ? null : Number(targetValue),
  );
  const [browsingTab, setTab] = useState<VersionTab | null>(null);
  const tab =
    browsingTab ??
    (kind === "merge"
      ? "merge"
      : kind === "branch" || kind === "local"
        ? "branch"
        : "version");
  const [note, setNote] = useState("");
  const [checkpointing, setCheckpointing] = useState(false);
  const [deletion, setDeletion] = useState<VersionDeletion | null>(null);
  const [destination, setDestination] = useState("");
  const [navigationError, setNavigationError] = useState("");
  const [catalogOpen, setCatalogOpen] = useState(false);
  const comparisonRoot = useRef<HTMLElement>(null);
  const working =
    versioning.busy ||
    versioning.saving ||
    versioning.targetLoading ||
    checkpointing;
  const active = versioning.merge?.status === "active";
  const editorUrl = `/admin/content/${type.id}/${session.id}/edit`;
  const select = (value: VersionSelection) => {
    const url = new URL(location.href);
    url.searchParams.set("view", value.kind);
    url.searchParams.set("selected", value.id);
    if (value.kind !== "version") url.searchParams.delete("compare");
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    setTab(null);
    setCatalogOpen(false);
    if (value.kind !== "version")
      requestAnimationFrame(() =>
        comparisonRoot.current?.scrollIntoView({
          block: "start",
          behavior: "instant",
        }),
      );
  };
  useEffect(() => {
    if (selection || !versioning.catalog) return;
    const item =
      versioning.catalog.versions[1] ?? versioning.catalog.versions[0];
    const value: VersionSelection | undefined = session.currentBranch
      ? { kind: "local", id: session.currentBranch.id }
      : item
        ? { kind: "version", id: String(item.revision) }
        : undefined;
    if (!value) return;
    const url = new URL(location.href);
    url.searchParams.set("view", value.kind);
    url.searchParams.set("selected", value.id);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    // Only choose a default before the URL has an explicit selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, selectedId, versioning.catalog]);
  const navigate = async (href: string) => {
    try {
      await session.prepareNavigation();
      const url = new URL(href, location.origin);
      if (url.origin === location.origin)
        router.push(`${url.pathname}${url.search}${url.hash}`);
      else location.assign(url.href);
    } catch (cause) {
      setNavigationError(
        cause instanceof Error ? cause.message : "无法保存草稿，请导出后继续。",
      );
    }
  };
  const leave = (href: string) => {
    if (working) return;
    if (active && versioning.canResolve) setDestination(href);
    else void navigate(href);
  };
  useEditorNavigation(Boolean(active && versioning.canResolve), working, leave);
  useEffect(() => {
    if (!active || !versioning.canResolve) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [active, versioning.canResolve]);
  const startMerge = async (work: Promise<string | null | false>) => {
    const mergeId = await work;
    if (mergeId) select({ kind: "merge", id: mergeId });
  };
  const local =
    selection?.kind === "local"
      ? versioning.local.find((entry) => entry.id === selection.id)
      : null;
  const history =
    selection?.kind === "version" &&
    versioning.version?.version.revision === Number(selection.id)
      ? versioning.version
      : null;
  const branch =
    selection?.kind === "branch" &&
    versioning.branch?.branch.id === selection.id
      ? versioning.branch
      : null;
  const headSelected = selection?.kind === "version" && selection.id === "head";
  const view =
    history?.fields ??
    branch?.fields ??
    local?.payload.fields ??
    (headSelected ? session.confirmedFields : undefined);
  const current =
    targetValue === "head"
      ? session.confirmedFields
      : versioning.target?.fields;
  const before = selection?.kind === "version" ? view : current;
  const after = selection?.kind === "version" ? current : view;
  const selectedMerge =
    active ||
    (tab === "merge" &&
      selection?.kind === "merge" &&
      selection.id === versioning.merge?.id);
  const selectedLabel = history
    ? `V${history.version.revision}`
    : headSelected
      ? "最新版 · 实时草稿"
      : branch?.branch.note || local?.payload.note || "草稿分支";
  const targetLabel =
    targetValue === "head" ? "最新版 · 实时草稿" : `V${targetValue}`;
  const selectTarget = (value: string) => {
    const url = new URL(location.href);
    if (url.searchParams.get("view") !== "version") {
      url.searchParams.set("view", "version");
      url.searchParams.set("selected", "head");
      setTab(null);
    }
    url.searchParams.set("compare", value);
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
  };
  const swapVersions = () => {
    const url = new URL(location.href);
    url.search = swapRevisionPair(url.searchParams).toString();
    window.history.pushState(null, "", `${url.pathname}${url.search}`);
    setTab(null);
  };
  const selectedInTab =
    (tab === "version" && selection?.kind === "version") ||
    (tab === "branch" && (branch || local));
  const resolvedMedia = {
    ...media,
    ...history?.media_urls,
    ...branch?.media_urls,
    ...versioning.target?.media_urls,
    ...versioning.merge?.media_urls,
  };
  return (
    <div className={styles.page}>
      <header className={styles.pageHeading}>
        <div>
          <Button
            className="admin-button"
            disabled={working}
            onClick={() => leave(editorUrl)}
          >
            <Icon name="arrow-left" />
            返回编辑
          </Button>
          <p className={styles.revisionContext}>{type.label} / 版本修订</p>
          <h1>{session.confirmedFields?.title || "未命名文章"}</h1>
        </div>
        <div className={styles.savePoint}>
          <TextField
            value={note}
            aria-label="版本说明"
            placeholder="版本说明（可选）"
            maxLength={200}
            onChange={(event) => setNote(event.target.value)}
          />
          <Button
            className="admin-button"
            disabled={
              working || !session.canEdit || session.state.mode !== "shared"
            }
            onClick={() => {
              setCheckpointing(true);
              void onCheckpoint(note)
                .then(async (saved) => {
                  if (saved) {
                    setNote("");
                    await versioning.refresh();
                  }
                })
                .finally(() => setCheckpointing(false));
            }}
          >
            保存版本
          </Button>
        </div>
      </header>
      {(versioning.error ||
        versioning.targetError ||
        saveError ||
        navigationError) && (
        <div className={styles.warning} role="alert">
          <span>
            {versioning.error ||
              versioning.targetError ||
              saveError ||
              navigationError}
          </span>
          <Button className="admin-button" onClick={versioning.retryRead}>
            重新读取
          </Button>
        </div>
      )}
      {versioning.notice && (
        <p className={styles.information} role="status">
          {versioning.notice}
        </p>
      )}
      <div className={styles.workflowBar}>
        <div className={styles.tabs} role="group" aria-label="版本区域">
          {(
            [
              ["version", "版本修订"],
              ["branch", "草稿分支"],
              ["merge", "合并记录"],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              disabled={working || Boolean(active)}
              aria-pressed={tab === key}
              onClick={() => {
                if (key === "version" && selection?.kind !== "version") {
                  const initial =
                    versioning.catalog?.versions[1] ??
                    versioning.catalog?.versions[0];
                  select({
                    kind: "version",
                    id: initial ? String(initial.revision) : "head",
                  });
                } else setTab(key);
              }}
            >
              {label}
            </Button>
          ))}
        </div>
        {tab === "version" && (
          <Button
            className="admin-button"
            disabled={working || Boolean(active)}
            aria-expanded={catalogOpen}
            onClick={() => setCatalogOpen(!catalogOpen)}
          >
            {catalogOpen
              ? "收起版本记录"
              : `版本记录${versioning.catalog ? ` · ${versioning.catalog.total}` : ""}`}
          </Button>
        )}
      </div>
      {tab === "version" && !active && (
        <VersionPairPicker
          versions={versioning.catalog?.versions ?? []}
          before={selection?.kind === "version" ? selection.id : "head"}
          after={targetValue}
          beforeDetail={history}
          afterDetail={versioning.target}
          disabled={versioning.saving || checkpointing || Boolean(active)}
          onBefore={(id) => select({ kind: "version", id })}
          onAfter={selectTarget}
          onSwap={swapVersions}
        />
      )}
      {(catalogOpen || (tab !== "version" && !active)) && (
        <VersionCatalog
          versioning={versioning}
          selection={selection}
          tab={tab}
          setTab={setTab}
          select={select}
          working={working}
          locked={Boolean(active)}
          onDelete={setDeletion}
          hideTabs
        />
      )}
      <section
        ref={comparisonRoot}
        className={styles.main}
        aria-label="版本详情与比较"
        aria-busy={working}
      >
        {selectedMerge ? (
          <VersionMergeWorkspace
            versioning={versioning}
            media={resolvedMedia}
            shortcodes={shortcodes}
            onResume={() => void startMerge(versioning.resumeResult())}
            onMedia={onMedia}
          />
        ) : selectedInTab && view && before && after ? (
          <>
            <div className={styles.selectionHeading}>
              <h2>区块差异</h2>
              <div className={styles.actions}>
                <Button
                  className="admin-button"
                  disabled={working || Boolean(session.state.merge)}
                  onClick={() => {
                    if (history) versioning.fromVersion(history);
                    else if (branch) versioning.editBranch(branch);
                    else if (local) versioning.editLocal(local);
                    else if (headSelected) session.returnToLatest();
                    void navigate(editorUrl);
                  }}
                >
                  {headSelected ? "编辑最新版" : "从此继续编辑"}
                </Button>
                {(branch || local) && (
                  <Button
                    className="admin-button admin-button-primary"
                    disabled={working || Boolean(session.state.merge)}
                    onClick={() =>
                      void startMerge(
                        local
                          ? versioning.startLocalMerge(local)
                          : versioning.startBranchMerge(branch!.branch.id),
                      )
                    }
                  >
                    开始合并
                  </Button>
                )}
                <DownloadButton
                  filename={`draft-${selection?.id}.json`}
                  content={() =>
                    serializeDraftExport(view, local?.removedBlocks)
                  }
                >
                  导出草稿
                </DownloadButton>
              </div>
            </div>
            <VersionComparison
              before={before}
              after={after}
              beforeLabel={
                selection?.kind === "version" ? selectedLabel : targetLabel
              }
              afterLabel={
                selection?.kind === "version" ? targetLabel : selectedLabel
              }
              media={resolvedMedia}
              shortcodes={shortcodes}
            />
          </>
        ) : (
          <div className={styles.emptyView}>
            <Icon name="book" />
            <h2>{working ? "正在读取版本…" : "选择一个版本开始比较"}</h2>
            <p>选择历史版本、独立草稿或合并记录。</p>
          </div>
        )}
      </section>
      <ConfirmDialog
        open={deletion !== null}
        title={`删除${deletion?.label ?? "草稿"}？`}
        description="这份历史草稿将从列表移除，当前最新版和前台发布内容继续保留。"
        confirmLabel="删除草稿"
        intent="danger"
        error={versioning.error}
        onCancel={() => setDeletion(null)}
        onConfirm={async () => Boolean(await deletion?.action())}
        onConfirmed={() => setDeletion(null)}
      />
      <ConfirmDialog
        open={Boolean(destination)}
        title="暂停合并并离开？"
        description="保存当前合并草稿并解除最新版的占用，之后需要重新比较当时的最新版。"
        confirmLabel="暂停并离开"
        error={versioning.error}
        onCancel={() => setDestination("")}
        onConfirm={async () => Boolean(await versioning.cancel())}
        onConfirmed={() => {
          const href = destination;
          setDestination("");
          void navigate(href);
        }}
      />
    </div>
  );
}
