"use client";
import { useId, useLayoutEffect, type ReactNode } from "react";
import { Button, Popover } from "./primitives";
import { useAnchoredPopover } from "./use-anchored-popover";

/** Shared light-dismiss actions; contained controls retain their native keyboard semantics. */
export function ActionPopover({
  label,
  disabled,
  className,
  panelClassName,
  triggerContent,
  children,
}: {
  label: string;
  disabled?: boolean;
  className?: string;
  panelClassName?: string;
  triggerContent: ReactNode;
  children: (close: () => void) => ReactNode;
}) {
  const id = useId();
  const {
    trigger,
    panel,
    open,
    ready,
    close,
    onBeforeToggle,
    onToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(228, true);
  useLayoutEffect(() => {
    if (open)
      panel.current
        ?.querySelector<HTMLButtonElement>("button:not(:disabled)")
        ?.focus({ preventScroll: true });
  }, [open, panel]);
  return (
    <>
      <Button
        ref={trigger}
        className={className}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={id}
        disabled={disabled || !ready}
        popoverTarget={id}
      >
        {triggerContent}
      </Button>
      <Popover
        ref={panel}
        id={id}
        role="dialog"
        aria-label={label}
        className={`ui-anchored-panel ${panelClassName ?? ""}`}
        onBeforeToggle={onBeforeToggle}
        onToggle={onToggle}
        onKeyDown={(event) => {
          onPanelKeyDown(event);
          if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key))
            return;
          const buttons = [
            ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
              "button:not(:disabled)",
            ),
          ].filter(
            (b) =>
              !b.closest('[role="dialog"]') ||
              b.closest('[role="dialog"]') === event.currentTarget,
          );
          const index = buttons.indexOf(
            document.activeElement as HTMLButtonElement,
          );
          const next =
            event.key === "Home"
              ? 0
              : event.key === "End"
                ? buttons.length - 1
                : (index +
                    (event.key === "ArrowDown" ? 1 : -1) +
                    buttons.length) %
                  buttons.length;
          event.preventDefault();
          buttons[next]?.focus();
        }}
      >
        {children(close)}
      </Popover>
    </>
  );
}
