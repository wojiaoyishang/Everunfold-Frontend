"use client";

import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Icon } from "../icon";
import { TransitionPanel } from "../transition-panel";
import { CommentBody } from "./comment-body";
import {
  COMMENT_MAX_LENGTH,
  insertCommentText,
  validateDraft,
  type CommentDraft,
  type CommentEntry,
  type DraftErrors,
} from "./model";

const initialDraft: CommentDraft = {
  author: "",
  body: "",
  email: "",
  website: "",
  formatted: true,
};
const noSubscription = () => () => {};
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

export function CommentComposer({
  reply,
  replying,
  onCancelReply,
  onAdd,
  notice,
}: {
  reply: CommentEntry | null;
  replying: boolean;
  onCancelReply: () => void;
  onAdd: (draft: Omit<CommentDraft, "email">) => void;
  notice: string;
}) {
  const prefix = useId();
  const editor = useRef<HTMLTextAreaElement>(null);
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [preview, setPreview] = useState(false);
  const [extra, setExtra] = useState(false);
  const [emoji, setEmoji] = useState(false);
  const [insertError, setInsertError] = useState("");
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  function update(value: Partial<CommentDraft>) {
    setDraft((current) => ({ ...current, ...value }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !(key in value)),
      ),
    );
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
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateDraft(draft);
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      setPreview(false);
      if (nextErrors.email || nextErrors.website) setExtra(true);
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(),
      );
      return;
    }
    onAdd({
      author: draft.author.trim(),
      body: draft.body.trim(),
      website: draft.website.trim(),
      formatted: draft.formatted,
    });
    setDraft((current) => ({ ...current, body: "", email: "" }));
    setPreview(false);
    setEmoji(false);
    setInsertError("");
  }
  return (
    <section
      id="comment-composer"
      className="surface comment-composer"
      tabIndex={-1}
      aria-labelledby={`${prefix}-title`}
    >
      <header className="composer-heading">
        <span className="composer-heading-icon">
          <Icon name="edit" />
        </span>
        <div>
          <h2 id={`${prefix}-title`}>围坐篝火，聊上几句</h2>
          <p>一句问候、一点共鸣，都值得被留下。</p>
        </div>
      </header>
      <TransitionPanel
        id={`${prefix}-reply`}
        labelledBy={`${prefix}-reply-title`}
        active={replying}
        role="region"
      >
        <div className="composer-reply">
          <div>
            <strong id={`${prefix}-reply-title`}>
              正在回复 @{reply?.author}
            </strong>
            <p>{reply?.body.slice(0, 90)}</p>
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label="取消回复"
            onClick={onCancelReply}
          >
            <Icon name="close" />
          </button>
        </div>
      </TransitionPanel>
      <form ref={form} onSubmit={submit} noValidate>
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
                <p className="preview-empty">
                  还没有写下文字，回到编辑试试吧。
                </p>
              )}
            </div>
          </TransitionPanel>
          <div className="composer-editor-footer">
            <label>
              <input
                type="checkbox"
                checked={draft.formatted}
                onChange={(event) =>
                  update({ formatted: event.target.checked })
                }
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
        <div className="composer-identity">
          <label htmlFor={`${prefix}-author`}>
            昵称 <span aria-hidden="true">*</span>
            <input
              id={`${prefix}-author`}
              name="author"
              required
              maxLength={40}
              autoComplete="nickname"
              placeholder="怎么称呼你？"
              value={draft.author}
              onChange={(event) => update({ author: event.target.value })}
              aria-invalid={!!errors.author}
              aria-describedby={
                errors.author ? `${prefix}-author-error` : undefined
              }
            />
            {errors.author && (
              <span
                id={`${prefix}-author-error`}
                className="form-error"
                role="alert"
              >
                {errors.author}
              </span>
            )}
          </label>
          <button
            id={`${prefix}-extra-toggle`}
            className="composer-extra-toggle"
            type="button"
            aria-expanded={extra}
            aria-controls={`${prefix}-extra-panel`}
            onClick={() => setExtra(!extra)}
          >
            邮箱与网站（选填）
            <Icon name="chevron" />
          </button>
        </div>
        <TransitionPanel
          id={`${prefix}-extra-panel`}
          labelledBy={`${prefix}-extra-toggle`}
          active={extra}
          role="region"
        >
          <div className="composer-extra-fields">
            <label htmlFor={`${prefix}-email`}>
              邮箱（不会公开）
              <input
                id={`${prefix}-email`}
                name="email"
                type="email"
                autoComplete="email"
                maxLength={254}
                placeholder="you@example.com"
                value={draft.email}
                onChange={(event) => update({ email: event.target.value })}
                aria-invalid={!!errors.email}
                aria-describedby={
                  errors.email ? `${prefix}-email-error` : undefined
                }
              />
              {errors.email && (
                <span
                  id={`${prefix}-email-error`}
                  className="form-error"
                  role="alert"
                >
                  {errors.email}
                </span>
              )}
            </label>
            <label htmlFor={`${prefix}-website`}>
              个人网站
              <input
                id={`${prefix}-website`}
                name="website"
                type="url"
                autoComplete="url"
                maxLength={300}
                placeholder="https://"
                value={draft.website}
                onChange={(event) => update({ website: event.target.value })}
                aria-invalid={!!errors.website}
                aria-describedby={
                  errors.website ? `${prefix}-website-error` : undefined
                }
              />
              {errors.website && (
                <span
                  id={`${prefix}-website-error`}
                  className="form-error"
                  role="alert"
                >
                  {errors.website}
                </span>
              )}
            </label>
          </div>
        </TransitionPanel>
        <div className="composer-submit-row">
          <p>
            <span className="preview-badge">互动演示</span>
            留言只显示在本页，不会发布；刷新后清除。
          </p>
          <button className="primary-button" type="submit" disabled={!hydrated}>
            <Icon name="send" />
            添加到本页
          </button>
        </div>
        <p className="composer-status" role="status">
          {notice}
        </p>
        <noscript>
          请启用 JavaScript 后体验评论交互；历史留言仍可阅读。
        </noscript>
      </form>
    </section>
  );
}
