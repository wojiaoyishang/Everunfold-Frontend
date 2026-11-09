"use client";
import { useId, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Button,
  Dialog,
  Icon,
  TextLink,
  surfacePortalTarget,
  useDialogDismiss,
  useDialogSurface,
  useLocale,
  useMotion,
} from "@everunfold/plugin-sdk/client";
import { CertificateImage } from "./image";
import { honorsText } from "./labels";
import type { Honor } from "./model";
import styles from "./styles.module.css";

export function Certificate({
  item,
  images,
  onSelect,
  onClose,
}: {
  item: Honor;
  images: Honor[];
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const close = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { uiLocale } = useLocale();
  const t = (text: string) => honorsText(text, uiLocale);
  const { enabled } = useMotion();
  const { closing, dismiss } = useDialogDismiss(dialog);
  useDialogSurface(dialog, close);
  const finish = () => dismiss(onClose);
  const index = images.findIndex((image) => image.id === item.id);
  const move = (offset: number) => {
    const next = images[index + offset];
    if (!closing && next) onSelect(next.id);
  };
  return createPortal(
    <Dialog
      ref={dialog}
      className={styles.dialog}
      aria-labelledby={titleId}
      data-state={closing ? "closing" : "open"}
      data-motion={enabled ? "full" : "reduced"}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        finish();
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        event.stopPropagation();
        move(event.key === "ArrowLeft" ? -1 : 1);
      }}
      onClick={(event) => {
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          finish();
      }}
    >
      <header className={styles.dialogHeader}>
        <div>
          <span>
            {item.date}
            {item.category && ` · ${t(item.category)}`}
          </span>
          <h2 id={titleId}>{item.title}</h2>
        </div>
        <Button
          ref={close}
          className={styles.iconButton}
          aria-label={t("关闭证书")}
          onClick={finish}
          disabled={closing}
        >
          <Icon name="close" />
        </Button>
      </header>
      <div className={styles.dialogBody}>
        <div className={styles.certificateImage}>
          {item.image && (
            <CertificateImage
              key={item.image}
              src={item.image}
              title={item.title}
              large
            />
          )}
        </div>
        {(item.award || item.description) && (
          <div className={styles.certificateDetails}>
            {item.award && <strong>{item.award}</strong>}
            {item.description && <p>{item.description}</p>}
          </div>
        )}
      </div>
      <footer className={styles.dialogFooter}>
        <div className={styles.viewerActions}>
          <Button
            className={styles.iconButton}
            aria-label={t("上一张证书")}
            onClick={() => move(-1)}
            disabled={closing || index <= 0}
          >
            <Icon name="chevron-left" />
          </Button>
          <span aria-live="polite">
            {index + 1} / {images.length}
          </span>
          <Button
            className={styles.iconButton}
            aria-label={t("下一张证书")}
            onClick={() => move(1)}
            disabled={closing || index < 0 || index >= images.length - 1}
          >
            <Icon name="chevron" />
          </Button>
          {item.image && (
            <TextLink
              href={item.image}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sourceLink}
            >
              {t("查看原图")}
              <Icon name="external" />
            </TextLink>
          )}
        </div>
      </footer>
    </Dialog>,
    surfacePortalTarget(),
  );
}
