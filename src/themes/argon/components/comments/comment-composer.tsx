"use client";
import { UiText } from "@/core/i18n/provider";

import { Button, Form } from "@/themes/argon/components/ui/primitives";

import {
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Icon } from "../icon";
import { TransitionPanel } from "../transition-panel";
import { CommentEditor } from "./comment-editor";
import { CommentIdentity } from "./comment-identity";
import {
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
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [errors, setErrors] = useState<DraftErrors>({});
  const [preview, setPreview] = useState(false);
  const [extra, setExtra] = useState(false);
  const [editorRevision, setEditorRevision] = useState(0);
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  // A reply started while previewing must expose the editor before moving focus.
  useEffect(() => {
    if (!replying) return;
    let focusFrame = 0;
    const frame = requestAnimationFrame(() => {
      setPreview(false);
      focusFrame = requestAnimationFrame(() =>
        form.current?.querySelector("textarea")?.focus({ preventScroll: true }),
      );
    });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(focusFrame);
    };
  }, [reply, replying]);
  function update(value: Partial<CommentDraft>) {
    setDraft((current) => ({ ...current, ...value }));
    setErrors((current) =>
      Object.fromEntries(
        Object.entries(current).filter(([key]) => !(key in value)),
      ),
    );
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
    setEditorRevision((current) => current + 1);
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
          <h2 id={`${prefix}-title`}>
            <UiText text="围坐篝火，聊上几句" />
          </h2>
          <p>
            <UiText text="一句问候、一点共鸣，都值得被留下。" />
          </p>
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
              <UiText text="正在回复 @" />
              {reply?.author}
            </strong>
            <p>{reply?.body.slice(0, 90)}</p>
          </div>
          <Button
            type="button"
            className="icon-button"
            aria-label="取消回复"
            onClick={onCancelReply}
          >
            <Icon name="close" />
          </Button>
        </div>
      </TransitionPanel>
      <Form ref={form} onSubmit={submit} noValidate>
        <CommentEditor
          key={editorRevision}
          prefix={prefix}
          draft={draft}
          errors={errors}
          preview={preview}
          setPreview={setPreview}
          onChange={update}
        />
        <CommentIdentity
          prefix={prefix}
          draft={draft}
          errors={errors}
          extra={extra}
          setExtra={setExtra}
          update={update}
        />
        <div className="composer-submit-row">
          <p>
            <span className="preview-badge">
              <UiText text="互动演示" />
            </span>
            <UiText text="留言只显示在本页，不会发布；刷新后清除。" />
          </p>
          <Button className="primary-button" type="submit" disabled={!hydrated}>
            <Icon name="send" />
            <UiText text="添加到本页" />
          </Button>
        </div>
        <p className="composer-status" role="status">
          {notice}
        </p>
        <noscript>
          <UiText text="请启用 JavaScript 后体验评论交互；历史留言仍可阅读。" />
        </noscript>
      </Form>
    </section>
  );
}
