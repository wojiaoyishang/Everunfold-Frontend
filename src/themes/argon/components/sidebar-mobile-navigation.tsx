"use client";
import "./sidebar-mobile-navigation.css";
import { useId, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import {
  navigationIsActive,
  navigationTarget,
  type NavigationItem,
} from "../navigation";
import { AppLink } from "./navigation-link";
import { LibraryIcon } from "./library-icon";
import { Icon } from "./icon";
import { Button } from "./ui/primitives";
import { TransitionPanel } from "./transition-panel";

/** Touch navigation expands in place; a separate link opens the parent's destination. */
export function SidebarMobileBranch({
  item,
  depth = 0,
  onNavigate,
}: {
  item: NavigationItem;
  depth?: number;
  onNavigate: () => void;
}) {
  const path = usePathname();
  const id = useId();
  const triggerId = `${id}-trigger`;
  const [choice, setChoice] = useState<{ path: string; open: boolean } | null>(
    null,
  );
  const open = choice?.path === path && choice.open;
  const children = !!item.children?.length;
  const active = navigationIsActive(path, item.href);
  return (
    <div
      className="mobile-menu-branch"
      style={{ "--menu-depth": Math.min(depth, 3) } as CSSProperties}
    >
      <div className="mobile-menu-row" data-active={active}>
        {children ? (
          <>
            <Button
              id={triggerId}
              className="mobile-menu-disclosure"
              aria-label={`${open ? "收起" : "展开"}${item.label}子菜单`}
              aria-controls={id}
              aria-expanded={open}
              onClick={() => setChoice({ path, open: !open })}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
                  event.preventDefault();
                  event.stopPropagation();
                  setChoice({ path, open: event.key === "ArrowRight" });
                }
              }}
            >
              <LibraryIcon name={item.icon} url={item.iconUrl} />
              <span>{item.label}</span>
              <Icon name="chevron" className="mobile-menu-chevron" />
            </Button>
            {item.href && item.href !== "#" && (
              <AppLink
                className="mobile-menu-parent-link"
                href={item.href}
                {...navigationTarget(item.href)}
                aria-label={`打开${item.label}页面`}
                title={`打开${item.label}页面`}
                aria-current={active ? "page" : undefined}
                onClick={onNavigate}
              >
                <Icon name="link" />
              </AppLink>
            )}
          </>
        ) : (
          <AppLink
            className="mobile-menu-link"
            href={item.href}
            {...navigationTarget(item.href)}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
          >
            <LibraryIcon name={item.icon} url={item.iconUrl} />
            <span>{item.label}</span>
          </AppLink>
        )}
      </div>
      {children && (
        <TransitionPanel
          id={id}
          labelledBy={triggerId}
          role="region"
          active={open}
        >
          {item.children!.map((child, index) => (
            <SidebarMobileBranch
              key={child.id ?? `${child.href}-${index}`}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </TransitionPanel>
      )}
    </div>
  );
}
