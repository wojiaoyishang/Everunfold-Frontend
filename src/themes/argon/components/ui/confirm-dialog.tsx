"use client";
import { surfacePortalTarget } from "@/core/themes/portal";
import { useT, UiText } from "@/core/i18n/provider";
import {
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { useDialogDismiss } from "../../hooks/use-dialog-dismiss";
import { useDialogSurface } from "../../hooks/use-dialog-surface";
import { Icon, type IconName } from "../icon";
import { Button, Dialog } from "./primitives";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  icon?: IconName;
  intent?: "default" | "danger" | "positive" | "warning";
  confirmLabel?: string;
  confirmIcon?: IconName;
  cancelLabel?: string;
  busyLabel?: string;
  busy?: boolean;
  confirmDisabled?: boolean;
  /** Opt in for data-entry dialogs; destructive confirmations keep explicit buttons. */
  submitOnEnter?: boolean;
  error?: string;
  /** Preserve the initiating control when an async preflight temporarily disabled it. */
  returnFocus?: RefObject<HTMLElement | null>;
  auxiliaryAction?: ReactNode;
  onCancel: () => void;
  /** Return true on success; false or rejection keeps the dialog open. */
  onConfirm: () => boolean | Promise<boolean>;
  /** Runs after the successful exit; close or navigate here, not in onConfirm. */
  onConfirmed: () => void;
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
  confirmIcon,
  cancelLabel = "取消",
  busyLabel = "正在处理…",
  busy = false,
  confirmDisabled = false,
  submitOnEnter = false,
  error,
  returnFocus,
  auxiliaryAction,
  onCancel,
  onConfirm,
  onConfirmed,
}: Omit<ConfirmDialogProps, "open">) {
  const t = useT();
  title = t(title);
  confirmLabel = t(confirmLabel);
  cancelLabel = t(cancelLabel);
  busyLabel = t(busyLabel);
  if (typeof description === "string")
    description = <UiText text={description} />;
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const inFlight = useRef(false);
  const [pending, setPending] = useState(false);
  const [unexpectedError, setUnexpectedError] = useState("");
  const titleId = useId();
  const descriptionId = useId();
  const working = busy || pending;
  const { closing, dismiss: finishAndDismiss } = useDialogDismiss(dialog);
  const locked = working || closing;
  useDialogSurface(dialog, cancel, returnFocus);
  const dismiss = () => {
    if (!busy && !inFlight.current) finishAndDismiss(onCancel);
  };
  const confirm = async () => {
    if (busy || closing || confirmDisabled || inFlight.current) return;
    inFlight.current = true;
    setPending(true);
    setUnexpectedError("");
    let succeeded = false;
    try {
      succeeded = await onConfirm();
      if (succeeded) finishAndDismiss(onConfirmed);
    } catch {
      setUnexpectedError("操作未完成，请稍后重试。");
    } finally {
      if (!succeeded) {
        inFlight.current = false;
        setPending(false);
      }
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
      data-state={closing ? "closing" : "open"}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        dismiss();
      }}
      onKeyDown={(event) => {
        if (
          submitOnEnter &&
          event.key === "Enter" &&
          !event.nativeEvent.isComposing &&
          event.target instanceof HTMLInputElement
        ) {
          event.preventDefault();
          event.stopPropagation();
          void confirm();
        }
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
        <fieldset className="ui-confirm-content" disabled={locked}>
          {children}
        </fieldset>
      )}
      {(error || unexpectedError) && (
        <p
          key={error || unexpectedError}
          className="ui-confirm-error"
          role="alert"
        >
          {error || unexpectedError}
        </p>
      )}
      <div className="ui-confirm-actions">
        <fieldset className="ui-confirm-auxiliary" disabled={locked}>
          {auxiliaryAction}
        </fieldset>
        <Button
          ref={cancel}
          className="ui-confirm-button"
          disabled={locked}
          onClick={dismiss}
        >
          {cancelLabel}
        </Button>
        <Button
          className="ui-confirm-button ui-confirm-submit"
          disabled={locked || confirmDisabled}
          onClick={() => void confirm()}
        >
          {working && (
            <span className="ui-confirm-spinner" aria-hidden="true" />
          )}
          {!working && confirmIcon && <Icon name={confirmIcon} />}
          <span key={working ? "busy" : "idle"} className="ui-confirm-label">
            {working ? busyLabel : confirmLabel}
          </span>
        </Button>
      </div>
    </Dialog>,
    surfacePortalTarget(),
  );
}
