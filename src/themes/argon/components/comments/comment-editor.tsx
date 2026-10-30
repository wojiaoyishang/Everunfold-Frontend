"use client";
import { useRef, useState } from "react";
import { Icon } from "../icon";
import { TransitionPanel } from "../transition-panel";
import { CommentBody } from "./comment-body";
import {
  COMMENT_MAX_LENGTH,
  insertCommentText,
  type CommentDraft,
  type DraftErrors,
} from "./model";
const emotions = [
  "✨",
  "☕",
  "🌙",
  "💛",
  "🌱",
  "🔥",
  "(๑•̀ㅂ•́)و✧",
  "|´・ω・)ノ",
];
export function CommentEditor({
  prefix,
  draft,
  errors,
  preview,
  setPreview,
  onChange,
}: {
  prefix: string;
  draft: Pick<CommentDraft, "body" | "formatted">;
  errors: Pick<DraftErrors, "body">;
  preview: boolean;
  setPreview: (value: boolean) => void;
  onChange: (value: Partial<Pick<CommentDraft, "body" | "formatted">>) => void;
}) {
  const editor = useRef<HTMLTextAreaElement>(null);
  const [emoji, setEmoji] = useState(false);
  const [insertError, setInsertError] = useState("");
  function update(value: Partial<Pick<CommentDraft, "body" | "formatted">>) {
    onChange(value);
    setInsertError("");
  }
  function insert(before: string, after = "", placeholder = "") {
    const input = editor.current;
    const value = insertCommentText(
      draft.body,
      input?.selectionStart ?? draft.body.length,
      input?.selectionEnd ?? draft.body.length,
      before,
      after,
      placeholder,
    );
    if (!value) {
      setInsertError("留言已达到 2000 字上限。");
      return;
    }
    update({ body: value.text });
    setPreview(false);
    requestAnimationFrame(() => {
      input?.focus({ preventScroll: true });
      input?.setSelectionRange(value.start, value.end);
    });
  }

  return (
    <>
      {" "}
      <div className="composer-editor">
        <div className="composer-editor-toolbar">
          <div
            className="composer-tabs"
            role="tablist"
            aria-label="留言编辑方式"
          >
            <button
              id={`${prefix}-write-tab`}
              type="button"
              role="tab"
              aria-selected={!preview}
              aria-controls={`${prefix}-write-panel`}
              onClick={() => setPreview(false)}
            >
              <Icon name="edit" />
              编辑
            </button>
            <button
              id={`${prefix}-preview-tab`}
              type="button"
              role="tab"
              aria-selected={preview}
              aria-controls={`${prefix}-preview-panel`}
              onClick={() => {
                setPreview(true);
                setEmoji(false);
              }}
            >
              <Icon name="eye" />
              预览
            </button>
          </div>
          {!preview && (
            <div className="composer-format-tools">
              <button
                type="button"
                aria-label="插入粗体"
                title="粗体"
                onClick={() => {
                  update({ formatted: true });
                  insert("**", "**", "想强调的话");
                }}
              >
                <b>B</b>
              </button>
              <button
                type="button"
                aria-label="插入行内代码"
                title="行内代码"
                onClick={() => {
                  update({ formatted: true });
                  insert("`", "`", "code");
                }}
              >
                <span aria-hidden="true">&lt;/&gt;</span>
              </button>
              <button
                id={`${prefix}-emoji-toggle`}
                type="button"
                aria-label="插入表情"
                aria-expanded={emoji}
                aria-controls={`${prefix}-emoji-panel`}
                onClick={() => setEmoji(!emoji)}
              >
                <Icon name="smile" />
              </button>
            </div>
          )}
        </div>
        <TransitionPanel
          id={`${prefix}-emoji-panel`}
          labelledBy={`${prefix}-emoji-toggle`}
          active={emoji && !preview}
          role="region"
        >
          <div className="composer-emotions">
            {emotions.map((value) => (
              <button
                key={value}
                type="button"
                aria-label={`插入 ${value}`}
                onClick={() => insert(value)}
              >
                {value}
              </button>
            ))}
          </div>
        </TransitionPanel>
        <TransitionPanel
          id={`${prefix}-write-panel`}
          labelledBy={`${prefix}-write-tab`}
          active={!preview}
        >
          <textarea
            ref={editor}
            name="body"
            aria-label="留言内容"
            aria-invalid={!!errors.body}
            aria-describedby={
              errors.body ? `${prefix}-body-error` : `${prefix}-format-help`
            }
            value={draft.body}
            onChange={(event) => update({ body: event.target.value })}
            maxLength={COMMENT_MAX_LENGTH}
            placeholder="想说的话，就写在这里吧…"
            rows={5}
          />
        </TransitionPanel>
        <TransitionPanel
          id={`${prefix}-preview-panel`}
          labelledBy={`${prefix}-preview-tab`}
          active={preview}
        >
          <div className="composer-preview">
            {draft.body.trim() ? (
              <CommentBody body={draft.body} formatted={draft.formatted} />
            ) : (
              <p className="preview-empty">还没有写下文字，回到编辑试试吧。</p>
            )}
          </div>
        </TransitionPanel>
        <div className="composer-editor-footer">
          <label>
            <input
              type="checkbox"
              checked={draft.formatted}
              onChange={(event) => update({ formatted: event.target.checked })}
            />
            文字格式
          </label>
          <span id={`${prefix}-format-help`}>
            支持 **粗体**、`代码`、&gt; 引用
          </span>
          <output aria-label="留言字数">
            {draft.body.length} / {COMMENT_MAX_LENGTH}
          </output>
        </div>
      </div>
      {(errors.body || insertError) && (
        <p className="form-error" id={`${prefix}-body-error`} role="alert">
          {errors.body || insertError}
        </p>
      )}
    </>
  );
}
