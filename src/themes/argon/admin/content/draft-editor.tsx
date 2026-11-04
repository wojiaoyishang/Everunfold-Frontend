"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ContentTypeDefinition } from "@/generated/content-admin-contract";
import { useDraftEditor } from "@/core/content-management/use-draft-editor";
import { useEditorNavigation } from "@/core/content-management/use-editor-navigation";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button } from "../../components/ui/primitives";
import { RouteLink } from "../../components/ui/route-link";
import { Icon } from "../../components/icon";
import { useInlineImageUploads } from "@/core/content-management/use-inline-image-uploads";
import { hasUploadMarkers } from "@/core/editor/upload-placeholders";
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { EditorTitle } from "./editor-title";
import { EditorActions } from "./editor-actions";
import { EditorPanels } from "./editor-panels";
import { BlockComposer } from "./block-composer";
import { ComposerSidebar } from "./block-library";
import styles from "./editor-workspace.module.css";
import { contentEditors } from "./editor-registry";
import { DraftPreview } from "./draft-preview";
import { ContentSync } from "./content-sync";
import { afterDialogMotion } from "../../hooks/dialog-motion";
import { CollaborationBar } from "./collaboration-bar";
import { InlineUploadToasts } from "./inline-upload-toasts";
import { useSceneShortcuts } from "../../hooks/use-scene-shortcuts";

export function DraftEditor({
  type,
  id,
}: {
  type: ContentTypeDefinition;
  id: string | null;
}) {
  const editor = useDraftEditor(type, id);
  const router = useRouter();
  const resources = useEditorResources();
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
  const [section, setSection] = useState<"body" | "settings">("body");
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [confirm, setConfirm] = useState<
    "close" | "reload" | "withdraw" | null
  >(null);
  const [destination, setDestination] = useState(`/admin/content/${type.id}`);
  const [leaving, setLeaving] = useState(false);
  const [dragging, setDragging] = useState(false);
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
    Boolean(
      id &&
      (!editor.collaboration?.ready ||
        editor.collaboration.phase === "stopped"),
    );
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
    if (editor.dirty || editor.uncertain) {
      setDestination(href);
      setConfirm("close");
    } else navigate(href);
  };
  useEditorNavigation(
    editor.dirty || editor.uncertain,
    editor.busy || leaving,
    requestLeave,
  );
  const save = async (action: "save" | "publish" | "withdraw" = "save") => {
    if (uploading && action !== "withdraw") return false;
    const result = await editor.save(action);
    if (result && !id)
      router.replace(`/admin/content/${type.id}/${result.id}/edit`);
    return Boolean(result);
  };
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
    Boolean(id && (!editor.detail || editor.collaboration?.phase !== "ready"));
  useSceneShortcuts([
    {
      key: "s",
      shift: "any",
      run: () => {
        // An uncertain operation could have been a publication: only the explicit retry may replay it.
        if (
          saveDisabled ||
          confirm !== null ||
          editor.uncertain ||
          (editor.detail && !editor.dirty)
        )
          return;
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
  return (
    <>
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
            返回{type.label}列表
          </Button>
          <div className={styles.headerActions}>
            <Button
              className="admin-button"
              aria-pressed={mode === "preview"}
              aria-controls="draft-editor-view"
              disabled={editor.loading || dragging || uploading}
              onClick={() => {
                setSection("body");
                setMode(mode === "edit" ? "preview" : "edit");
              }}
            >
              <Icon name={mode === "preview" ? "edit" : "eye"} />
              {mode === "preview" ? "返回编辑" : "预览"}
            </Button>
            {editor.detail?.published_revision && editor.detail.public_path && (
              <RouteLink
                className="admin-button"
                href={editor.detail.public_path}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="external" />
                查看前台
              </RouteLink>
            )}
            <EditorActions
              detail={editor.detail}
              busy={editor.busy}
              uncertain={editor.uncertain}
              dirty={editor.dirty}
              disabled={saveDisabled}
              onSave={(action) => void save(action)}
              onWithdraw={() => setConfirm("withdraw")}
            />
            <span
              role="status"
              className={notice ? "admin-draft-saved" : styles.visuallyHidden}
              key={notice || "idle"}
            >
              {notice || (editor.dirty ? "有未保存的修改" : "")}
            </span>
          </div>
        </div>
        <h1
          className={styles.visuallyHidden}
        >{`${id ? "编辑" : "新建"}${type.label}`}</h1>
        <EditorTitle
          type={type}
          fields={editor.fields}
          detail={editor.detail}
          onChange={editor.setFields}
          disabled={Boolean(blocked || (id && !editor.detail))}
        />
        <CollaborationBar
          session={editor.session}
          status={editor.collaboration}
          fields={editor.fields}
          localChanges={editor.stagedBlocks.length > 0}
          recoveryContent={editor.recoveryContent}
          disabled={Boolean(blocked || dragging)}
        />
        <div className={styles.mobileTabs} aria-label="编辑区域">
          <Button
            aria-pressed={section === "body"}
            onClick={() => setSection("body")}
          >
            正文
          </Button>
          <Button
            aria-pressed={section === "settings"}
            onClick={() => setSection("settings")}
          >
            内容设置
          </Button>
        </div>
        <ConfirmDialog
          open={confirm !== null}
          title={
            confirm === "withdraw"
              ? "撤回这份内容？"
              : confirm === "reload"
                ? "读取最新内容？"
                : editor.uncertain
                  ? "离开编辑页面？"
                  : "放弃尚未保存的修改？"
          }
          description={
            confirm === "withdraw"
              ? "前台将不再展示这份内容，草稿与历史记录会保留。"
              : editor.uncertain
                ? "上次保存结果尚未确认。离开后请检查列表中的保存状态。"
                : "当前未保存的输入将被放弃。"
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
          <div className={styles.layout} data-section={section}>
            <section
              className={styles.main}
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
                    这份内容已在回收站，请返回列表恢复后再编辑。
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
                        重新读取
                      </Button>
                    )}
                    {editor.conflict && (
                      <Button
                        className="admin-button"
                        disabled={editor.busy}
                        onClick={() => void editor.readLatest()}
                      >
                        查看最新内容
                      </Button>
                    )}
                  </div>
                )}
                {editor.loading ? (
                  <div className="admin-draft-empty" role="status">
                    正在读取内容…
                  </div>
                ) : (
                  (!id || editor.detail) && (
                    <div key={mode} className="admin-draft-editor-view">
                      {mode === "preview" ? (
                        <DraftPreview fields={editor.fields} media={media} />
                      ) : Fields ? (
                        <Fields
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
                        <p>此类型的编辑器暂不可用，内容仍会保留。</p>
                      )}
                    </div>
                  )
                )}
                {editor.latest && (
                  <section className="admin-draft-conflict">
                    <header>
                      <strong>服务器上的最新内容</strong>
                      <Button
                        className="admin-button"
                        onClick={() => setConfirm("reload")}
                      >
                        使用这个版本
                      </Button>
                    </header>
                    <DraftPreview
                      fields={editor.latest}
                      media={editor.latest.media_urls}
                    />
                  </section>
                )}
              </div>
            </section>
            <ComposerSidebar settingsOnly={section === "settings"}>
              <EditorPanels
                type={type}
                fields={editor.fields}
                onChange={editor.setFields}
                detail={editor.detail}
                disabled={Boolean(blocked || (id && !editor.detail))}
                terms={resources.terms}
                createCategory={resources.createCategory}
                media={media}
                onMedia={resources.remember}
              />
            </ComposerSidebar>
          </div>
        </BlockComposer>
        <ContentSync refreshKey={editor.detail?.revision ?? 0} />
      </div>
    </>
  );
}
