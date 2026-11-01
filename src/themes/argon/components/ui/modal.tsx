"use client";
import { useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog, Button } from "./primitives";
import { Icon } from "../icon";
import { useDialogSurface } from "../../hooks/use-dialog-surface";
/** Native modal owns focus, Escape and focus restoration; shared by full-page pickers. */
export function Modal({
  title,
  onClose,
  children,
  className = "",
  closeLabel = "关闭选择器",
}: {
  title: string;
  className?: string;
  closeLabel?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useDialogSurface(ref);
  return createPortal(
    <Dialog
      ref={ref}
      className={`admin-library-modal admin-surface ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const rect = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < rect.left ||
            event.clientX > rect.right ||
            event.clientY < rect.top ||
            event.clientY > rect.bottom
          )
            onClose();
        }
      }}
    >
      <div className="admin-library-modal-heading">
        <h2 id={titleId}>{title}</h2>
        <Button
          className="admin-icon-button"
          aria-label={closeLabel}
          onClick={onClose}
        >
          <Icon name="close" />
        </Button>
      </div>
      {children}
    </Dialog>,
    document.querySelector(".admin-root") ?? document.body,
  );
}
