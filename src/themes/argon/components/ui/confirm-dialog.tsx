"use client";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useDialogSurface } from "../../hooks/use-dialog-surface";
import { Icon, type IconName } from "../icon";
import { Button, Dialog } from "./primitives";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  intent?: "default" | "danger";
  confirmLabel?: string;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  error?: string;
  auxiliaryAction?: ReactNode;
  onCancel: () => void;
  /** Caller owns success/close and business errors; rejection keeps this open. */
  onConfirm: () => void | Promise<void>;
}

const noSubscription = () => () => {};

/** Shared confirmation surface for public pages, admin features and plugins. */
export function ConfirmDialog({ open, ...props }: ConfirmDialogProps) {
  const ready = useSyncExternalStore(
    noSubscription,
    () => true,
    () => false,
  );
  return ready && open ? <ConfirmDialogSurface {...props} /> : null;
}

function ConfirmDialogSurface({
  title,
  description,
  children,
  icon,
  intent = "default",
  confirmLabel = "确认",
  cancelLabel = "取消",
  busyLabel = "正在处理…",
  busy = false,
  confirmDisabled = false,
  error,
  auxiliaryAction,
  onCancel,
  onConfirm,
}: Omit<ConfirmDialogProps, "open">) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [unexpectedError, setUnexpectedError] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const working = busy || pending;
  useDialogSurface(dialog, cancel);
  const dismiss = () => {
    if (!busy && !inFlight.current) onCancel();
  };
  const confirm = async () => {
    if (busy || confirmDisabled || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setUnexpectedError("");
    try {
      await onConfirm();
    } catch {
      setUnexpectedError("操作未完成，请稍后重试。");
    } finally {
      inFlight.current = false;
      setPending(false);
    }
  };
  return createPortal(
    <Dialog
      ref={dialog}
      className="ui-confirm-dialog"
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-busy={working}
      data-intent={intent}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }}
      onClick={(event) => {
        // Portal events must never dismiss the underlying attachment dialog.
        event.stopPropagation();
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          dismiss();
      }}
    >
      <div className="ui-confirm-heading">
        {icon && (
          <span className="ui-confirm-icon">
            <Icon name={icon} />
          </span>
        )}
        <div>
          <h2 id={titleId}>{title}</h2>
          {description && (
            <div id={descriptionId} className="ui-confirm-description">
              {description}
            </div>
          )}
        </div>
      </div>
      {children && (
        <fieldset className="ui-confirm-content" disabled={working}>
          {children}
        </fieldset>
      )}
      {(error || unexpectedError) && (
        <p className="ui-confirm-error" role="alert">
          {error || unexpectedError}
        </p>
      )}
      <div className="ui-confirm-actions">
        <fieldset className="ui-confirm-auxiliary" disabled={working}>
          {auxiliaryAction}
        </fieldset>
        <Button
          ref={cancel}
          className="ui-confirm-button"
          disabled={working}
          onClick={dismiss}
        >
          {cancelLabel}
        </Button>
        <Button
          className="ui-confirm-button ui-confirm-submit"
          disabled={working || confirmDisabled}
          onClick={() => void confirm()}
        >
          {working && (
            <span className="ui-confirm-spinner" aria-hidden="true" />
          )}
          {working ? busyLabel : confirmLabel}
        </Button>
      </div>
    </Dialog>,
    document.querySelector(".admin-root") ?? document.body,
  );
}
