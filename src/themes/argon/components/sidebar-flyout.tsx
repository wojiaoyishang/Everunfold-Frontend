"use client";
import "./sidebar-flyout.css";
import { useId } from "react";
import { usePathname } from "next/navigation";
import {
  navigationIsActive,
  navigationTarget,
  type NavigationItem,
} from "../navigation";
import { useSidebarFlyout } from "../hooks/use-sidebar-flyout";
import { AppLink } from "./navigation-link";
import { LibraryIcon } from "./library-icon";
import { Icon } from "./icon";
import { Button, Popover } from "./ui/primitives";

/** Sidebar navigation has its own popup behavior; it never expands the card's height. */
export function SidebarFlyout({
  item,
  onNavigate,
}: {
  item: NavigationItem;
  onNavigate: () => void;
}) {
  const path = usePathname();
  const id = useId();
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
  } = useSidebarFlyout();
  const children = !!item.children?.length;
  return (
    <div
      className="sidebar-flyout-branch"
      onPointerEnter={(e) => {
        if (e.pointerType === "mouse" && children) show();
      }}
      onPointerLeave={(e) => {
        if (e.pointerType === "mouse") scheduleClose();
      }}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) close();
      }}
    >
      <div
        className="sidebar-flyout-row"
        ref={row}
        data-open={open}
        onKeyDown={(e) => {
          if (children && (e.key === "ArrowRight" || e.key === "ArrowDown")) {
            e.preventDefault();
            e.stopPropagation();
            show(true);
          }
        }}
      >
        <AppLink
          href={item.href}
          {...navigationTarget(item.href)}
          aria-current={
            navigationIsActive(path, item.href) ? "page" : undefined
          }
          onClick={onNavigate}
        >
          <LibraryIcon name={item.icon} url={item.iconUrl} />
          <span>{item.label}</span>
        </AppLink>
        {children && (
          <Button
            ref={trigger}
            className="sidebar-flyout-toggle"
            aria-label={`${open ? "收起" : "展开"}${item.label}子菜单`}
            aria-expanded={open}
            aria-controls={id}
            popoverTarget={id}
          >
            <Icon name="chevron" />
          </Button>
        )}
      </div>
      {children && (
        <Popover
          ref={panel}
          id={id}
          className="sidebar-flyout-panel"
          aria-label={`${item.label}子菜单`}
          onBeforeToggle={beforeToggle}
          onToggle={onToggle}
          onPointerEnter={cancelLeave}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "ArrowLeft") {
              e.preventDefault();
              e.stopPropagation();
              close();
              trigger.current?.focus({ preventScroll: true });
            }
          }}
        >
          <p className="sidebar-flyout-heading">{item.label}</p>
          {item.children!.map((child, index) => (
            <SidebarFlyout
              key={child.id ?? `${child.href}-${index}`}
              item={child}
              onNavigate={onNavigate}
            />
          ))}
        </Popover>
      )}
    </div>
  );
}
