"use client";
import { useState } from "react";
import type {
  ContentTypeDefinition,
  DraftDetail,
} from "@/generated/content-admin-contract";
import { useDraftEditor } from "@/core/content-management/use-draft-editor";
import { Modal } from "../../components/ui/modal";
import { ConfirmDialog } from "../../components/ui/confirm-dialog";
import { Button } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";
import { contentEditors } from "./editor-registry";
import { DraftPreview } from "./draft-preview";

export function DraftEditor({
  type,
  id,
  onClose,
  onSaved,
}: {
  type: ContentTypeDefinition;
  id: string | null;
  onClose: () => void;
  onSaved: (item: DraftDetail) => void;
}) {
  const editor = useDraftEditor(type, id);
  const [mode, setMode] = useState<"edit" | "preview">("edit");
  const [closing, setClosing] = useState(false);
  const [confirm, setConfirm] = useState<"close" | "reload" | null>(null);
  const Fields = contentEditors[type.editor];
  const requestClose = () => {
    if (editor.busy || closing) return;
    if (editor.dirty || editor.uncertain) setConfirm("close");
    else setClosing(true);
  };
  const blocked = editor.busy || editor.loading || editor.uncertain || closing;
  return (
    <Modal
      title={`${editor.detail || id ? "编辑" : "新建"}${type.label}`}
      className="admin-draft-modal"
      closeLabel="关闭编辑窗口"
      onClose={requestClose}
      closing={closing}
      onExited={onClose}
    >
      <ConfirmDialog
        open={confirm !== null}
        title={
          confirm === "reload"
            ? "读取最新内容？"
            : editor.uncertain
              ? "离开编辑窗口？"
              : "放弃尚未保存的修改？"
        }
        description={
          editor.uncertain
            ? "上次保存的结果尚未确认。离开后请刷新列表，确认内容是否已经保存。"
            : "当前未保存的输入将被放弃。"
        }
        icon="undo"
        confirmLabel={confirm === "reload" ? "读取最新内容" : "离开编辑"}
        cancelLabel="继续编辑"
        onCancel={() => setConfirm(null)}
        onConfirm={() => true}
        onConfirmed={() => {
          if (confirm === "reload") editor.acceptLatest();
          else setClosing(true);
          setConfirm(null);
        }}
      />
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
          草稿{editor.detail?.is_demo ? " · 示例" : ""}
        </span>
      </div>
      <div className="admin-draft-editor-scroll" aria-busy={editor.loading}>
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
                <DraftPreview fields={editor.fields} />
              ) : Fields ? (
                <Fields
                  type={type}
                  value={editor.fields}
                  onChange={editor.setFields}
                  disabled={blocked}
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
            <DraftPreview fields={editor.latest} />
          </section>
        )}
      </div>
      <footer className="admin-draft-editor-footer">
        <span
          role="status"
          className={editor.notice ? "admin-draft-saved" : ""}
          key={editor.notice || "idle"}
        >
          {editor.notice ? (
            <>
              <Icon name="check" />
              {editor.notice}
            </>
          ) : editor.dirty ? (
            "有未保存的修改"
          ) : (
            "保存到草稿，稍后继续创作"
          )}
        </span>
        <Button
          className="admin-button admin-button-primary"
          disabled={
            editor.busy ||
            editor.loading ||
            closing ||
            editor.conflict ||
            !Fields ||
            Boolean(id && !editor.detail) ||
            Boolean(!editor.dirty && editor.detail && !editor.uncertain)
          }
          onClick={async () => {
            const result = await editor.save();
            if (result) onSaved(result);
          }}
        >
          <Icon
            name={editor.busy ? "refresh" : "check"}
            className={editor.busy ? "admin-draft-spin" : ""}
          />
          {editor.busy ? "保存中…" : editor.uncertain ? "重试保存" : "保存草稿"}
        </Button>
      </footer>
    </Modal>
  );
}
