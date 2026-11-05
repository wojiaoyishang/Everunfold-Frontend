"use client";
import { UiText } from "@/core/i18n/provider";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { afterDialogMotion } from "../../hooks/dialog-motion";
import { Icon } from "../icon";
import { Button, Popover } from "./primitives";
import { useAnchoredPopover } from "./use-anchored-popover";
import styles from "./confirm-popover.module.css";

/** Lightweight confirmation for local edits; durable/destructive requests use ConfirmDialog. */
export function ConfirmPopover({
  label,
  title,
  description,
  children,
  triggerClassName,
  disabled = false,
  onConfirmed,
}: {
  label: string;
  title: string;
  description?: string;
  children: ReactNode;
  triggerClassName?: string;
  disabled?: boolean;
  onConfirmed: () => void;
}) {
  const id = useId();
  const {
    trigger,
    panel,
    open,
    ready,
    close,
    onToggle,
    onBeforeToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(256, true);
  const cancel = useRef<HTMLButtonElement>(null);
  const finish = useRef<() => void>(() => {});
  const completion = useRef(onConfirmed);
  const locked = useRef(false);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    completion.current = onConfirmed;
  }, [onConfirmed]);
  useLayoutEffect(() => {
    if (open) cancel.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => () => finish.current(), []);
  const confirm = () => {
    if (disabled || locked.current) return;
    locked.current = true;
    setClosing(true);
    close();
    finish.current = afterDialogMotion(panel.current, () => {
      completion.current();
      locked.current = false;
      setClosing(false);
    });
  };
  return (
    <>
      <Button
        ref={trigger}
        className={triggerClassName}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={id}
        popoverTarget={id}
        disabled={disabled || !ready || closing}
      >
        {children}
      </Button>
      <Popover
        ref={panel}
        id={id}
        role="dialog"
        aria-labelledby={`${id}-title`}
        aria-describedby={description ? `${id}-description` : undefined}
        className={`ui-anchored-panel ${styles.panel}`}
        data-closing={closing}
        onBeforeToggle={onBeforeToggle}
        onToggle={onToggle}
        onKeyDown={onPanelKeyDown}
        onBlur={(event) => {
          const target = event.relatedTarget;
          if (
            target instanceof Node &&
            !event.currentTarget.contains(target) &&
            !trigger.current?.contains(target)
          )
            panel.current?.hidePopover();
        }}
      >
        <div className={styles.heading}>
          <Icon name="trash" />
          <strong id={`${id}-title`}>{title}</strong>
        </div>
        {description && <p id={`${id}-description`}>{description}</p>}
        <div className={styles.actions}>
          <Button ref={cancel} disabled={closing} onClick={close}>
            <UiText text="取消" />
          </Button>
          <Button
            className={styles.remove}
            disabled={disabled || closing}
            onClick={confirm}
          >
            <Icon name="trash" />
            <UiText text="删除" />
          </Button>
        </div>
      </Popover>
    </>
  );
}
