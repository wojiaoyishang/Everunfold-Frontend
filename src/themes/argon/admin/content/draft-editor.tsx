"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ComponentDraftEditor } from "./component-draft-editor";
import type { ContentTypeDefinition } from "@/core/contracts/content-admin";
import { useEmbeddedPreviewPublisher } from "@/core/preview/use-embedded-publisher";
import { isEmbeddedEditor, requestEmbeddedLeave } from "@/core/preview/bridge";
import { editorPreviewContent } from "@/core/preview/content";
import {
  useDraftEditor,
  type DraftSaveAction,
} from "@/core/content-management/use-draft-editor";
import { useEditorNavigation } from "@/core/content-management/use-editor-navigation";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { useAdminAccount } from "@/core/admin/account-context";
import { can } from "@/core/accounts/permissions";
import { Icon } from "../../components/icon";
import { useInlineImageUploads } from "@/core/content-management/use-inline-image-uploads";
import { hasUploadMarkers } from "@/core/editor/upload-placeholders";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { EditorTitle } from "./editor-title";
import { EditorActions } from "./editor-actions";
import { EditorPanels } from "./editor-panels";
import type { PublicationChoice } from "./publication-schedule";
import { BlockComposer } from "./block-composer";
import { BlockLibrary, ComposerSidebar } from "./block-library";
import styles from "./editor-workspace.module.css";
import editorColumns from "../components/editor-columns.module.css";
import { contentEditors } from "./editor-registry";
import { DraftPreview } from "./draft-preview";
import { ContentSync } from "./content-sync";
import { afterDialogMotion } from "../../hooks/dialog-motion";
import { CollaborationBar } from "./collaboration-bar";
import { InlineUploadToasts } from "./inline-upload-toasts";
import { FrontendPreviewButton } from "./frontend-preview-button";
import { useSceneShortcuts } from "../../hooks/use-scene-shortcuts";
import { CodePreferencesProvider } from "../../components/code-preferences";
import { ScrollHeaderActions } from "../layout/scroll-header-actions";
import { useAppliedShortcodes } from "@/core/shortcodes/use-library";
import { EditorLanguages } from "./editor-languages";
import type { Locale } from "@/core/i18n/locale";
import { useLanguageCatalog } from "@/core/i18n/provider";

export function DraftEditor({
  type,
  id,
}: {
  type: ContentTypeDefinition;
  id: string | null;
}) {
  const embedded = isEmbeddedEditor();
  const languages = useLanguageCatalog();
  const [language, setLanguage] = useState<Locale>("");
  const editor = useDraftEditor(type, id, language || undefined);
  const [publication, setPublication] = useState<PublicationChoice | null>(
    null,
  );
  const publicationChoice = publication ?? {
    enabled: Boolean(editor.detail?.scheduled_for),
    at: editor.detail?.scheduled_for ?? null,
  };
  const account = useAdminAccount();
  const router = useRouter();
  const resources = useEditorResources();
  const shortcodes = useAppliedShortcodes();
  const uploads = useInlineImageUploads({
    onTransform: editor.transformBlockContent,
    onMedia: resources.remember,
  });
  const uploading = hasUploadMarkers(editor.fields.body);
  const media = {
    ...editor.detail?.media_urls,
    ...resources.media,
    ...editor.session?.mediaUrls,
  };
  const liveContent = editor.detail
    ? editorPreviewContent(editor.detail, editor.fields, media)
    : null;
  useEmbeddedPreviewPublisher(
    editor.detail?.edit_mode === "components" ? null : id,
    liveContent
      ? { type: "everunfold:content-preview", content: liveContent }
      : null,
    {
      dirty: editor.unsaved || editor.uncertain,
      busy: editor.busy || uploading,
      published: Boolean(editor.detail?.published_revision),
    },
  );
  const [section, setSection] = useState<"body" | "settings">("body");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [confirm, setConfirm] = useState<
    "close" | "reload" | "withdraw" | null
  >(null);
  const [destination, setDestination] = useState(`/admin/content/${type.id}`);
  const [leaving, setLeaving] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [navigationError, setNavigationError] = useState("");
  const surface = useRef<HTMLDivElement>(null);
  const saveFocus = useRef<HTMLElement | null>(null);
  const [focusRequest, setFocusRequest] = useState(0);
  useEffect(() => {
    if (!focusRequest || editor.busy) return;
    const focused = saveFocus.current;
    saveFocus.current = null;
    if (focused?.isConnected && document.activeElement === document.body)
      focused.focus({ preventScroll: true });
  }, [focusRequest, editor.busy]);
  const Fields = contentEditors[type.editor];
  const archived = editor.detail?.status === "trash";
  const blocked =
    editor.busy ||
    editor.awaitingSources ||
    editor.loading ||
    editor.uncertain ||
    leaving ||
    archived ||
    Boolean(id && !editor.session?.canEdit);
  const navigate = (href: string) => {
    setDestination(href);
    setLeaving(true);
  };
  useEffect(() => {
    if (!leaving) return;
    // Reuse bounded motion completion; reduced/cancelled motion also completes navigation.
    return afterDialogMotion(surface.current, () => {
      const url = new URL(destination, location.origin);
      if (url.origin === location.origin)
        router.push(`${url.pathname}${url.search}${url.hash}`);
      else location.assign(url.href);
    });
  }, [leaving, destination, router]);
  const requestLeave = (href: string) => {
    if (editor.busy || leaving) return;
    if (requestEmbeddedLeave(href)) return;
    if (editor.unsaved || editor.uncertain) {
      setDestination(href);
      setConfirm("close");
    } else navigate(href);
  };
  useEditorNavigation(
    editor.unsaved || editor.uncertain,
    editor.busy || leaving,
    requestLeave,
  );
  const persist = async (action: DraftSaveAction = "save", note = "") => {
    if (uploading && action !== "withdraw" && action !== "cancel_schedule")
      return null;
    const result = await editor.save(
      action,
      note,
      action === "schedule" ? publicationChoice.at : undefined,
    );
    if (result && ["schedule", "cancel_schedule", "publish"].includes(action))
      setPublication(null);
    if (result && !id)
      router.replace(`/admin/content/${type.id}/${result.id}/edit`);
    return result;
  };
  const save = async (action: DraftSaveAction = "save") =>
    Boolean(await persist(action));
  const saveDisabled =
    editor.awaitingSources ||
    uploading ||
    dragging ||
    editor.busy ||
    editor.loading ||
    leaving ||
    editor.conflict ||
    archived ||
    !Fields ||
    Boolean(
      id &&
      (!editor.detail ||
        editor.collaboration?.phase !== "ready" ||
        editor.collaboration.mode !== "shared" ||
        editor.collaboration.merge),
    );
  useSceneShortcuts([
    {
      key: "s",
      shift: "any",
      run: () => {
        // An uncertain operation could have been a publication: only the explicit retry may replay it.
        if (saveDisabled || confirm !== null || editor.uncertain) return;
        saveFocus.current =
          document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
        void save("save").then(() => {
          if (surface.current) setFocusRequest((value) => value + 1);
        });
      },
    },
  ]);
  const notice = editor.dirty ? "" : editor.notice;
  if (
    editor.detail &&
    !can(account, "content:write", editor.detail.owner_id ?? null)
  )
    return (
      <section className="admin-panel">
        <h1>
          <UiText text="没有编辑此内容的权限" />
        </h1>
        <p>
          <UiText text="你可以查看这篇内容，但没有编辑权限。" />
        </p>
        <RouteLink
          className="admin-button"
          href={`/admin/content/${type.id}/${editor.detail.id}/preview`}
        >
          <UiText text="前台预览" />
        </RouteLink>
      </section>
    );
  if (editor.detail?.edit_mode === "components")
    return (
      <ComponentDraftEditor type={type} id={id} initialDetail={editor.detail} />
    );
  return (
    <CodePreferencesProvider value={resources.codePreferences}>
      <InlineUploadToasts uploads={uploads} />
      <div
        ref={surface}
        className={`admin-content-editor-page ${styles.workspace}`}
        data-leaving={leaving}
        onKeyDownCapture={(event) => {
          if (
            dragging &&
            (event.ctrlKey || event.metaKey) &&
            ["z", "y"].includes(event.key.toLowerCase())
          ) {
            event.preventDefault();
            event.stopPropagation();
            return;
          }
          if (
            dragging ||
            !editor.session ||
            blocked ||
            event.nativeEvent.isComposing ||
            event.altKey ||
            (!event.ctrlKey && !event.metaKey)
          )
            return;
          if (
            (event.target instanceof Element &&
              event.target.closest("[data-editor-local-control]")) ||
            (event.target instanceof HTMLInputElement &&
              event.target.type === "password")
          )
            return;
          const key = event.key.toLowerCase();
          if (key !== "z" && key !== "y") return;
          event.preventDefault();
          event.stopPropagation();
          if (key === "y" || event.shiftKey) editor.session.undo.redo();
          else editor.session.undo.undo();
        }}
      >
        <div className="admin-editor-back">
          <Button
            className="admin-button"
            disabled={editor.busy || leaving || dragging}
            onClick={() => requestLeave(`/admin/content/${type.id}`)}
          >
            <Icon name="arrow-left" />
            <UiText text="返回" />
            <UiText text={type.label} />
            <UiText text="列表" />
          </Button>
          <div className={styles.headerActions}>
            <ScrollHeaderActions className={styles.previewActions}>
              {(type.id === "article" || type.id === "shuoshuo") && (
                <Button
                  className="admin-button admin-editor-preview-action"
                  disabled={
                    editor.loading || editor.busy || uploading || dragging
                  }
                  onClick={() =>
                    requestLeave(
                      `/admin/content/${type.id}/${id ? `${id}/edit` : "new"}?mode=components`,
                    )
                  }
                >
                  <Icon name="grid" />
                  <UiText text="组件模式" />
                </Button>
              )}
              <Button
                className="admin-button admin-editor-preview-action"
                aria-pressed={mode === "preview"}
                aria-controls="draft-editor-view"
                disabled={editor.loading || dragging || uploading}
                onClick={() => {
                  setSection("body");
                  setMode(mode === "edit" ? "preview" : "edit");
                }}
              >
                <Icon name={mode === "preview" ? "edit" : "eye"} />
                {mode === "preview" ? (
                  <UiText text="返回编辑" />
                ) : (
                  <UiText text="正文预览" />
                )}
              </Button>
              <FrontendPreviewButton
                needsSave={editor.dirty || !editor.detail}
                disabled={Boolean(saveDisabled || editor.uncertain)}
                prepare={() =>
                  !editor.dirty && editor.detail
                    ? Promise.resolve(editor.detail)
                    : persist("save")
                }
              />
              <FrontendPreviewButton
                mode="live"
                needsSave={editor.dirty || !editor.detail}
                disabled={Boolean(saveDisabled || editor.uncertain)}
                prepare={() =>
                  !editor.dirty && editor.detail
                    ? Promise.resolve(editor.detail)
                    : persist("save")
                }
              />
              {editor.detail?.published_revision &&
                editor.detail.public_path && (
                  <RouteLink
                    className="admin-button admin-editor-preview-action"
                    href={editor.detail.public_path}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon name="external" />
                    <UiText text="查看前台" />
                  </RouteLink>
                )}
              <EditorActions
                detail={editor.detail}
                scheduled={publicationChoice.enabled}
                busy={editor.busy}
                uncertain={editor.uncertain}
                dirty={editor.dirty}
                disabled={saveDisabled}
                onSave={(action) => void save(action)}
                onWithdraw={() => setConfirm("withdraw")}
              />
            </ScrollHeaderActions>
            <span
              role="status"
              className={notice ? "admin-draft-saved" : styles.visuallyHidden}
              key={notice || "idle"}
            >
              {notice || (editor.dirty ? <UiText text="有未保存的修改" /> : "")}
            </span>
          </div>
        </div>
        <h1
          className={styles.visuallyHidden}
        >{`${id ? "编辑" : "新建"}${type.label}`}</h1>
        <div data-live-part="settings">
          <EditorTitle
            type={type}
            fields={editor.fields}
            detail={editor.detail}
            language={
              editor.detail?.language || language || languages.default_code
            }
            onChange={editor.setFields}
            disabled={Boolean(blocked || (id && !editor.detail))}
          />
          <EditorLanguages
            key={id ?? "new"}
            id={id}
            contentRevision={editor.detail?.revision}
            type={type.id}
            language={
              editor.detail?.language || language || languages.default_code
            }
            onLanguage={setLanguage}
            disabled={Boolean(editor.busy || leaving || uploading)}
            onNavigate={(href) => {
              if (
                href ===
                `/admin/content/${type.id}/${id}/edit#content-languages`
              ) {
                location.hash = "content-languages";
                return;
              }
              if (editor.privateUnsaved || editor.uncertain) {
                requestLeave(href);
                return;
              }
              if (editor.session)
                void editor.session
                  .prepareNavigation()
                  .then(() => navigate(href))
                  .catch((cause: unknown) =>
                    setNavigationError(
                      cause instanceof Error
                        ? cause.message
                        : "请先保存本地草稿。",
                    ),
                  );
              else requestLeave(href);
            }}
          />
        </div>
        <div data-live-part="settings">
          <CollaborationBar
            session={editor.session}
            status={editor.collaboration}
            fields={editor.fields}
            localChanges={editor.stagedBlocks.length > 0}
            recoveryContent={editor.recoveryContent}
            disabled={Boolean(blocked || dragging)}
            onLocate={(peer) => {
              setMode("edit");
              setSection("body");
              requestAnimationFrame(() =>
                requestAnimationFrame(() => editor.session?.locatePeer(peer)),
              );
            }}
            onVersions={() => {
              if (!id || !editor.session) return;
              const href = `/admin/content/${type.id}/${id}/versions`;
              if (editor.privateUnsaved || editor.uncertain) requestLeave(href);
              else
                void editor.session
                  .prepareNavigation()
                  .then(() => navigate(href))
                  .catch((cause: unknown) =>
                    setNavigationError(
                      cause instanceof Error
                        ? cause.message
                        : "无法保存草稿，请导出后继续。",
                    ),
                  );
            }}
          />
        </div>
        {navigationError && (
          <p className="admin-draft-message" role="alert">
            {navigationError}
          </p>
        )}
        {!embedded && (
          <div className={styles.mobileTabs} aria-label="编辑区域">
            <Button
              aria-pressed={section === "body"}
              onClick={() => setSection("body")}
            >
              <UiText text="正文" />
            </Button>
            <Button
              aria-pressed={section === "settings"}
              onClick={() => setSection("settings")}
            >
              <UiText text="内容设置" />
            </Button>
          </div>
        )}
        <ConfirmDialog
          open={confirm !== null}
          title={
            confirm === "withdraw"
              ? "撤回这份内容？"
              : confirm === "reload"
                ? "读取最新内容？"
                : editor.uncertain
                  ? "离开编辑页面？"
                  : editor.collaboration?.branchId
                    ? "保留本地草稿并离开？"
                    : "离开编辑页面？"
          }
          description={
            confirm === "withdraw"
              ? "前台将不再展示这份内容，草稿与历史记录会保留。"
              : editor.uncertain
                ? "上次保存结果尚未确认。离开后请检查列表中的保存状态。"
                : editor.collaboration?.branchId && editor.collaboration.local
                  ? "本地草稿保存在此浏览器，之后可从版本管理继续编辑。"
                  : "尚未确认的输入会保留为本机恢复草稿，请在返回后检查同步状态。"
          }
          icon={confirm === "withdraw" ? "eye-off" : "undo"}
          confirmLabel={
            confirm === "withdraw"
              ? "撤回内容"
              : confirm === "reload"
                ? "读取最新内容"
                : "离开编辑"
          }
          cancelLabel="继续编辑"
          error={confirm === "withdraw" ? editor.error : undefined}
          onCancel={() => setConfirm(null)}
          onConfirm={() => (confirm === "withdraw" ? save("withdraw") : true)}
          onConfirmed={() => {
            if (confirm === "reload") editor.acceptLatest();
            else if (confirm === "close") {
              if (!editor.uncertain) editor.discardSources();
              navigate(destination);
            }
            setConfirm(null);
          }}
        />
        <BlockComposer
          body={editor.fields.body}
          disabled={Boolean(blocked || mode === "preview")}
          command={editor.commandBlock}
          onBusyChange={setDragging}
        >
          <div
            className={`${editorColumns.layout} ${styles.layout}`}
            data-section={section}
          >
            {embedded && (
              <div data-live-part="library">
                <BlockLibrary
                  quiet
                  onInsert={() =>
                    window.parent.postMessage(
                      { type: "everunfold:focus-editor", id },
                      window.location.origin,
                    )
                  }
                />
              </div>
            )}
            <section
              className={styles.main}
              data-live-part="content"
              aria-label={`${type.label}编辑器`}
              data-mode={mode}
            >
              <div
                id="draft-editor-view"
                className="admin-draft-editor-scroll"
                aria-busy={editor.loading}
              >
                {archived && (
                  <p className="admin-draft-message">
                    <UiText text="这份内容已在回收站，请返回列表恢复后再编辑。" />
                  </p>
                )}
                {editor.error && (
                  <div className="admin-draft-message" role="alert">
                    <span>{editor.error}</span>
                    {id && !editor.detail && !editor.loading && (
                      <Button
                        className="admin-button"
                        onClick={editor.retryRead}
                      >
                        <UiText text="重新读取" />
                      </Button>
                    )}
                    {editor.conflict && (
                      <Button
                        className="admin-button"
                        disabled={editor.busy}
                        onClick={() => void editor.readLatest()}
                      >
                        <UiText text="查看最新内容" />
                      </Button>
                    )}
                  </div>
                )}
                {editor.loading ? (
                  <div className="admin-draft-empty" role="status">
                    <UiText text="正在读取内容…" />
                  </div>
                ) : (
                  (!id || editor.detail) && (
                    <div key={mode} className="admin-draft-editor-view">
                      {mode === "preview" ? (
                        <DraftPreview
                          fields={editor.fields}
                          media={media}
                          shortcodes={shortcodes}
                        />
                      ) : Fields ? (
                        <Fields
                          session={editor.session}
                          type={type}
                          value={editor.fields}
                          onChange={editor.setFields}
                          disabled={Boolean(blocked)}
                          onMedia={resources.remember}
                          media={media}
                          onBlockChange={editor.setBlockContent}
                          stagedBlocks={editor.stagedBlocks}
                          uploads={uploads}
                          locked={(id) =>
                            Boolean(editor.session?.sources.locked(id))
                          }
                        />
                      ) : (
                        <p>
                          <UiText text="此类型的编辑器暂不可用，内容仍会保留。" />
                        </p>
                      )}
                    </div>
                  )
                )}
                {editor.latest && (
                  <section className="admin-draft-conflict">
                    <header>
                      <strong>
                        <UiText text="服务器上的最新内容" />
                      </strong>
                      <Button
                        className="admin-button"
                        onClick={() => setConfirm("reload")}
                      >
                        <UiText text="使用这个版本" />
                      </Button>
                    </header>
                    <DraftPreview
                      shortcodes={shortcodes}
                      fields={editor.latest}
                      media={editor.latest.media_urls}
                    />
                  </section>
                )}
              </div>
            </section>
            <ComposerSidebar
              embedded={embedded}
              settingsOnly={section === "settings"}
            >
              <EditorPanels
                type={type}
                fields={editor.fields}
                onChange={editor.setFields}
                detail={editor.detail}
                disabled={Boolean(blocked || (id && !editor.detail))}
                terms={resources.terms}
                newArticleDefaults={
                  id === null && type.id === "article"
                    ? resources.defaults
                    : null
                }
                createCategory={resources.createCategory}
                media={media}
                onMedia={resources.remember}
                publication={{
                  choice: publicationChoice,
                  onChange: setPublication,
                  onCancel: () => void save("cancel_schedule"),
                  disabled:
                    saveDisabled ||
                    editor.uncertain ||
                    !can(
                      account,
                      "content:publish",
                      editor.detail?.owner_id ?? null,
                    ),
                }}
              />
            </ComposerSidebar>
          </div>
        </BlockComposer>
        <div data-live-part="settings">
          <ContentSync
            refreshKey={
              (editor.detail?.revision ?? 0) *
              (editor.detail?.scheduled_for ? -1 : 1)
            }
          />
        </div>
      </div>
    </CodePreferencesProvider>
  );
}
