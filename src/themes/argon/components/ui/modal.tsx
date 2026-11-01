"use client";
import { useLayoutEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Dialog, Button } from "./primitives";
import { Icon } from "../icon";
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
  useLayoutEffect(() => {
    const dialog = ref.current;
    const trigger = document.activeElement;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (trigger instanceof HTMLElement && trigger.isConnected)
        trigger.focus({ preventScroll: true });
    };
  }, []);
  return createPortal(
    <Dialog
      ref={ref}
      className={`admin-library-modal admin-surface ${className}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
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
