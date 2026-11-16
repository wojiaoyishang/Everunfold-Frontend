"use client";

import { useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Avatar,
  Button,
  Dialog,
  Icon,
  surfacePortalTarget,
  UiText,
  useDialogDismiss,
  useDialogSurface,
  useT,
} from "@everunfold/plugin-sdk/client";
import { mediaUrl, text, type WidgetProps } from "./values";
import styles from "./widgets.module.css";

export function Greeting({ values, media, preview }: WidgetProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const name = text(values, "name");
  const subtitle = text(values, "subtitle");
  const message = text(values, "message");
  const avatar = mediaUrl(text(values, "avatar"), media);
  if (!name && !preview) return null;
  const displayName = name || t("未命名");
  return (
    <>
      <Button
        className={styles.person}
        aria-haspopup="dialog"
        aria-label={t("查看{name}的寄语", { name: displayName })}
        onClick={() => setOpen(true)}
      >
        <Avatar name={displayName} src={avatar} size={32} />
        <span>
          {displayName}
          {subtitle && <small>{subtitle}</small>}
        </span>
        <Icon name="comment" />
      </Button>
      {open && (
        <GreetingDialog
          name={displayName}
          subtitle={subtitle}
          message={message}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function GreetingDialog({
  name,
  subtitle,
  message,
  onClose,
}: {
  name: string;
  subtitle: string;
  message: string;
  onClose: () => void;
}) {
  const title = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const { closing, dismiss } = useDialogDismiss(dialog);
  useDialogSurface(dialog, closeButton);
  const finish = () => dismiss(onClose);
  return createPortal(
    <Dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={title}
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        event.preventDefault();
        finish();
      }}
    >
      <h2 id={title}>{name}</h2>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      <blockquote>{message || <UiText text="还没有留下寄语。" />}</blockquote>
      <Button
        ref={closeButton}
        className={styles.close}
        disabled={closing}
        onClick={finish}
      >
        <UiText text="收起寄语" />
      </Button>
    </Dialog>,
    surfacePortalTarget(),
  );
}
