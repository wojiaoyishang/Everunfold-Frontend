"use client";
import { UiText } from "@/core/i18n/provider";
import { useId, useLayoutEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog, Button } from "./primitives";
import { Icon } from "../icon";
import { useDialogSurface } from "../../hooks/use-dialog-surface";
import { afterDialogMotion } from "../../hooks/dialog-motion";
/** Native modal owns focus, Escape and focus restoration; shared by full-page pickers. */
export function Modal({
  title,
  onClose,
  children,
  className = "",
  closeLabel = "关闭选择器",
  closing = false,
  onExited,
  headerActions,
}: {
  title: string;
  className?: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
  closing?: boolean;
  onExited?: () => void;
  headerActions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useDialogSurface(ref);
  useLayoutEffect(() => {
    if (closing && onExited) return afterDialogMotion(ref.current, onExited);
  }, [closing, onExited]);
  return createPortal(
    <Dialog
      ref={ref}
      className={`admin-library-modal admin-surface ${className}`}
      aria-labelledby={titleId}
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!closing) onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          ) {
            if (!closing) onClose();
          }
        }
      }}
    >
      <div className="admin-library-modal-heading">
        <h2 id={titleId}>
          <UiText text={title} />
        </h2>
        {headerActions}
        <Button
          className="admin-icon-button"
          aria-label={closeLabel}
          onClick={onClose}
          disabled={closing}
        >
          <Icon name="close" />
        </Button>
      </div>
      {children}
    </Dialog>,
    document.querySelector(".admin-root") ?? document.body,
  );
}
