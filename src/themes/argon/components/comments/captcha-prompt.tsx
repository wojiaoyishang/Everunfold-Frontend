"use client";
import { useEffect, useRef, type RefObject } from "react";
import type { CaptchaController } from "@/core/captcha/use-captcha";
import type { CaptchaAnswer } from "@/core/contracts/captcha";
import { CaptchaField } from "../captcha-field";
import { ConfirmDialog } from "../ui/confirm-dialog";

/** All providers use the same theme dialog; only a confirmed answer releases send. */
export function CommentCaptchaPrompt({
  captcha,
  returnFocus,
  onCancel,
  onConfirm,
}: {
  captcha: CaptchaController;
  returnFocus: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: (answer: CaptchaAnswer | undefined) => void;
}) {
  const root = useRef<HTMLDivElement>(null);
  const selected = useRef<CaptchaAnswer | undefined>(undefined);
  useEffect(() => {
    if (captcha.pending) return;
    const frame = requestAnimationFrame(() =>
      root.current?.querySelector<HTMLInputElement>("input")?.focus(),
    );
    return () => cancelAnimationFrame(frame);
  }, [captcha.pending, captcha.challenge?.challenge_id]);
  return (
    <ConfirmDialog
      open
      title="发送前验证"
      description="完成安全验证后发送评论，你的输入会一直保留。"
      icon="lock"
      confirmLabel="验证并发送"
      confirmIcon="send"
      submitOnEnter
      confirmDisabled={!captcha.ready}
      returnFocus={returnFocus}
      onCancel={onCancel}
      onConfirm={() => {
        if (!captcha.ready) return false;
        selected.current = captcha.response;
        return true;
      }}
      onConfirmed={() => onConfirm(selected.current)}
    >
      <div ref={root}>
        <CaptchaField control={captcha} />
      </div>
    </ConfirmDialog>
  );
}
