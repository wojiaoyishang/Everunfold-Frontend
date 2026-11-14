"use client";
import { UiText } from "@/core/i18n/provider";

import { Button, Form } from "@/themes/argon/components/ui/primitives";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";
import { Icon } from "../icon";
import { TransitionPanel } from "../transition-panel";
import { CommentEditor } from "./comment-editor";
import { CommentIdentity } from "./comment-identity";
import type { CaptchaController } from "@/core/captcha/use-captcha";
import type { CaptchaAnswer } from "@/core/contracts/captcha";
import { CommentCaptchaPrompt } from "./captcha-prompt";
import { CommentFeedback, type CommentFeedbackProps } from "./comment-feedback";
import {
  commentSubmissionFailure,
  type CommentSubmissionResult,
} from "./submission";
import {
  validateDraft,
  type CommentDraft,
  type CommentEntry,
  type DraftErrors,
} from "./model";

const initialDraft: CommentDraft = {
  author: "",
  body: "",
  website: "",
  formatted: true,
};
const noSubscription = () => () => {};

export function CommentComposer({
  reply,
  replying,
  onCancelReply,
  onAdd,
  captcha,
  signedInName,
}: {
  reply: CommentEntry | null;
  replying: boolean;
  onCancelReply: () => void;
  onAdd: (
    draft: CommentDraft,
    answer?: CaptchaAnswer,
    signal?: AbortSignal,
  ) => CommentSubmissionResult | Promise<CommentSubmissionResult>;
  captcha?: CaptchaController;
  signedInName?: string | null;
}) {
  const prefix = useId();
  const form = useRef<HTMLFormElement>(null);
  const [draft, setDraft] = useState(() => ({
    ...initialDraft,
    author: signedInName ?? "",
  }));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [preview, setPreview] = useState(false);
  const [extra, setExtra] = useState(false);
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [feedback, setFeedback] = useState<Pick<
    CommentFeedbackProps,
    "status" | "message"
  > | null>(null);
  const sendButton = useRef<HTMLButtonElement>(null);
  const restorePromptFocus = useRef(false);
  const inFlight = useRef(false);
  const alive = useRef(true);
  const request = useRef<AbortController | null>(null);
  const gate = useRef<
    ((answer: CaptchaAnswer | undefined | false) => void) | null
  >(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const hydrated = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      request.current?.abort();
      gate.current?.(false);
      gate.current = null;
    };
  }, []);
  useLayoutEffect(() => {
    if (!sending && !verifying && restorePromptFocus.current) {
      restorePromptFocus.current = false;
      sendButton.current?.focus({ preventScroll: true });
    }
  }, [sending, verifying]);
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
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current) return;
    const effectiveAuthor = signedInName?.trim() || draft.author.trim();
    const nextErrors = validateDraft({ ...draft, author: effectiveAuthor });
    setErrors(nextErrors);
    const first = Object.keys(nextErrors)[0];
    if (first) {
      setPreview(false);
      if (nextErrors.website) setExtra(true);
      requestAnimationFrame(() =>
        form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus(),
      );
      return;
    }
    inFlight.current = true;
    setSending(true);
    const controller = new AbortController();
    request.current = controller;
    try {
      let answer: CaptchaAnswer | undefined;
      if (captcha) {
        setFeedback({ status: "checking", message: "正在检查发送条件…" });
        const challenge = await captcha.prepare();
        if (!alive.current || controller.signal.aborted) return;
        if (challenge.required) {
          setFeedback(null);
          const verified = await new Promise<CaptchaAnswer | undefined | false>(
            (resolve) => {
              gate.current = resolve;
              setVerifying(true);
            },
          );
          gate.current = null;
          if (!alive.current || controller.signal.aborted || verified === false)
            return;
          answer = verified;
        }
      }
      if (!alive.current || controller.signal.aborted) return;
      setFeedback({ status: "sending", message: "正在发送评论，请稍候…" });
      const result = await onAdd(
        {
          author: effectiveAuthor,
          body: draft.body.trim(),
          website: draft.website.trim(),
          formatted: draft.formatted,
        },
        answer,
        controller.signal,
      );
      if (!alive.current || controller.signal.aborted) return;
      setFeedback({
        status: result.accepted ? "success" : "error",
        message: result.message,
      });
      if (!result.accepted) return;
      setDraft((current) => ({ ...current, body: "" }));
      setPreview(false);
      setEditorRevision((current) => current + 1);
    } catch (reason) {
      if (alive.current && !controller.signal.aborted)
        setFeedback({
          status: "error",
          message: commentSubmissionFailure(reason),
        });
    } finally {
      inFlight.current = false;
      if (alive.current) {
        setSending(false);
        captcha?.reset();
        requestAnimationFrame(() => {
          if (
            alive.current &&
            (document.activeElement === document.body ||
              document.activeElement === sendButton.current)
          )
            sendButton.current?.focus({ preventScroll: true });
        });
      }
    }
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
            disabled={sending}
          >
            <Icon name="close" />
          </Button>
        </div>
      </TransitionPanel>
      <Form ref={form} onSubmit={submit} noValidate>
        <div inert={sending}>
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
            signedInName={signedInName}
            setExtra={setExtra}
            update={update}
          />
        </div>
        <div className="composer-submit-row">
          {!captcha && (
            <p>
              <span className="preview-badge">
                <UiText text="互动演示" />
              </span>
              <UiText text="留言只显示在本页，不会发布；刷新后清除。" />
            </p>
          )}
          <Button
            ref={sendButton}
            className="primary-button"
            type="submit"
            disabled={!hydrated || sending}
          >
            <Icon name="send" />
            <UiText
              text={sending ? "正在提交…" : captcha ? "提交评论" : "添加到本页"}
            />
          </Button>
        </div>
        <noscript>
          <UiText text="请启用 JavaScript 后体验评论交互；历史留言仍可阅读。" />
        </noscript>
      </Form>
      {captcha && verifying && (
        <CommentCaptchaPrompt
          captcha={captcha}
          returnFocus={sendButton}
          onCancel={() => {
            restorePromptFocus.current = true;
            setVerifying(false);
            gate.current?.(false);
          }}
          onConfirm={(answer) => {
            setVerifying(false);
            gate.current?.(answer);
          }}
        />
      )}
      {feedback && (
        <CommentFeedback {...feedback} onDismiss={() => setFeedback(null)} />
      )}
    </section>
  );
}
