"use client";

import { useId, type ReactNode } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { useSidebarFlyout } from "../../hooks/use-sidebar-flyout";
import { Button, Popover } from "../../components/ui/primitives";
import { Icon } from "../../components/icon";

/** Top-layer panels stay outside the scrolling sidebar without changing its height. */
export function AdminNavigationFlyout({
  label,
  icon,
  current,
  children,
  onPin,
}: {
  label: string;
  icon: ReactNode;
  current: boolean;
  children: ReactNode;
  onPin: () => void;
}) {
  const id = useId(),
    t = useT();
  const {
    row,
    trigger,
    panel,
    open,
    show,
    close,
    cancelLeave,
    scheduleClose,
    beforeToggle,
    onToggle,
  } = useSidebarFlyout(".admin-sidebar");
  return (
    <div
      className="admin-nav-branch admin-nav-flyout-branch"
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") show();
      }}
      onPointerLeave={(event) => {
        if (
          event.pointerType === "mouse" &&
          !event.currentTarget.contains(document.activeElement)
        )
          scheduleClose();
      }}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape" || event.key === "ArrowLeft") {
          event.preventDefault();
          event.stopPropagation();
          close();
          trigger.current?.focus({ preventScroll: true });
        }
      }}
    >
      <div ref={row}>
        <Button
          ref={trigger}
          className="admin-nav-link admin-nav-trigger"
          aria-expanded={open}
          aria-controls={id}
          aria-label={t(label)}
          title={t(label)}
          data-current={current}
          popoverTarget={id}
          popoverTargetAction="show"
          onClick={(event) => {
            event.preventDefault();
            close();
            onPin();
          }}
          onKeyDown={(event) => {
            if (event.key === "ArrowRight" || event.key === "ArrowDown") {
              event.preventDefault();
              event.stopPropagation();
              show(true);
            }
          }}
        >
          {icon}
          <span className="admin-nav-text">
            <UiText text={label} />
          </span>
          <span className="admin-nav-chevron" aria-hidden="true">
            <Icon name="chevron" />
          </span>
        </Button>
      </div>
      <Popover
        ref={panel}
        id={id}
        className="admin-nav-flyout"
        aria-labelledby={`${id}-heading`}
        onBeforeToggle={beforeToggle}
        onToggle={onToggle}
        onPointerEnter={cancelLeave}
        onFocus={cancelLeave}
      >
        <p id={`${id}-heading`} className="admin-nav-flyout-heading">
          <UiText text={label} />
        </p>
        {children}
      </Popover>
    </div>
  );
}
