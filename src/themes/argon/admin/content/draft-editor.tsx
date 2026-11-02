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
import { useEditorResources } from "@/core/content-management/use-editor-resources";
import { EditorTitle } from "./editor-title";
import { EditorActions } from "./editor-actions";
import { EditorPanels } from "./editor-panels";
import styles from "./editor-workspace.module.css";
import { contentEditors } from "./editor-registry";
import { DraftPreview } from "./draft-preview";
import { ContentSync } from "./content-sync";
import { afterDialogMotion } from "../../hooks/dialog-motion";
import { DraftCollaborationContext } from "@/core/collaboration/context";
import { CollaborationBar } from "./collaboration-bar";

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
  const surface = useRef<HTMLDivElement>(null);
  const Fields = contentEditors[type.editor];
  const archived = editor.detail?.status === "trash";
  const blocked =
    editor.busy ||
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
    const result = await editor.save(action);
    if (result && !id)
      router.replace(`/admin/content/${type.id}/${result.id}/edit`);
    return Boolean(result);
  };
  const saveDisabled =
    editor.busy ||
    editor.loading ||
    leaving ||
    editor.conflict ||
    archived ||
    !Fields ||
    Boolean(id && (!editor.detail || editor.collaboration?.phase !== "ready"));
  return (
    <DraftCollaborationContext value={editor.session}>
      <div
        ref={surface}
        className={`admin-content-editor-page ${styles.workspace}`}
        data-leaving={leaving}
        onKeyDownCapture={(event) => {
          if (
            !editor.session ||
            blocked ||
            event.nativeEvent.isComposing ||
            event.altKey ||
            (!event.ctrlKey && !event.metaKey)
          )
            return;
          if (
            event.target instanceof HTMLInputElement &&
            event.target.type === "password"
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
            disabled={editor.busy || leaving}
            onClick={() => requestLeave(`/admin/content/${type.id}`)}
          >
            <Icon name="arrow-left" />
            返回{type.label}列表
          </Button>
          <div className={styles.headerActions}>
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
              className={
                editor.notice ? "admin-draft-saved" : styles.visuallyHidden
              }
              key={editor.notice || "idle"}
            >
              {editor.notice || (editor.dirty ? "有未保存的修改" : "")}
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
          disabled={Boolean(blocked)}
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
            else if (confirm === "close") navigate(destination);
            setConfirm(null);
          }}
        />
        <div className={styles.layout} data-section={section}>
          <section className={styles.main} aria-label={`${type.label}编辑器`}>
            <div className="admin-draft-editor-toolbar">
              <div className="admin-draft-tabs" aria-label="编辑视图">
                <Button
                  aria-pressed={mode === "edit"}
                  onClick={() => setMode("edit")}
                >
                  <Icon name="edit" />
                  编辑
                </Button>
                <Button
                  aria-pressed={mode === "preview"}
                  disabled={editor.loading}
                  onClick={() => setMode("preview")}
                >
                  <Icon name="eye" />
                  预览
                </Button>
              </div>
              <span className="admin-badge">
                {archived
                  ? "已回收"
                  : editor.detail?.published_revision
                    ? "已发布"
                    : "草稿"}
                {editor.detail?.is_demo ? " · 示例" : ""}
              </span>
            </div>
            <div
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
                    <Button className="admin-button" onClick={editor.retryRead}>
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
        </div>
        <ContentSync refreshKey={editor.detail?.revision ?? 0} />
      </div>
    </DraftCollaborationContext>
  );
}
