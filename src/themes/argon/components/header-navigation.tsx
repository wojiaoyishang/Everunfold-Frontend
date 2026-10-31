"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
} from "react";
import { usePathname } from "next/navigation";
import type { Site } from "@/core/content/types";
import {
  navigationIsActive,
  navigationTarget,
  siteNavigation,
} from "../navigation";
import { AppLink as Link } from "./navigation-link";
import { Icon } from "./icon";

/** Website disclosure navigation: parent links stay links; arrows open child panels. */
export function HeaderNavigation({ site }: { site: Site }) {
  const pathname = usePathname();
  const id = useId();
  const root = useRef<HTMLElement>(null);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [opened, setOpened] = useState<string | null>(null);
  function cancelLeave() {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
  }
  function close(event?: MouseEvent<HTMLAnchorElement>) {
    cancelLeave();
    setOpened(null);
    if (event && event.detail > 0) event.currentTarget.blur();
  }
  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpened(null);
    };
    const onHistory = () => setOpened(null);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("popstate", onHistory);
    return () => {
      if (leaveTimer.current) clearTimeout(leaveTimer.current);
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("popstate", onHistory);
    };
  }, []);
  function onKey(event: KeyboardEvent<HTMLDivElement>, href: string) {
    const group = event.currentTarget;
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      close();
      group.querySelector<HTMLButtonElement>("button")?.focus();
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    cancelLeave();
    setOpened(href);
    const links = Array.from(
      group.querySelectorAll<HTMLAnchorElement>(".header-submenu a"),
    );
    const current = links.indexOf(document.activeElement as HTMLAnchorElement);
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? links.length - 1
          : event.key === "ArrowDown"
            ? (current + 1) % links.length
            : current < 0
              ? links.length - 1
              : (current + links.length - 1) % links.length;
    requestAnimationFrame(() => links[next]?.focus());
  }
  return (
    <nav ref={root} className="header-navigation" aria-label="顶部导航">
      {siteNavigation(site).map((item, index) => {
        const expanded = opened === item.href;
        const panelId = `${id}-${index}`;
        const active = navigationIsActive(pathname, item.href);
        return (
          <div
            key={item.href}
            className="header-menu-item"
            data-open={expanded}
            onPointerEnter={(event) => {
              if (event.pointerType !== "mouse") return;
              cancelLeave();
              setOpened(item.children ? item.href : null);
            }}
            onPointerLeave={(event) => {
              if (event.pointerType !== "mouse") return;
              cancelLeave();
              leaveTimer.current = setTimeout(() => setOpened(null), 140);
            }}
            onBlur={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget)) close();
            }}
            onKeyDown={
              item.children ? (event) => onKey(event, item.href) : undefined
            }
          >
            <div className="header-menu-trigger">
              <Link
                href={item.href}
                className="header-menu-link"
                aria-current={active ? "page" : undefined}
                {...navigationTarget(item.href)}
                onClick={close}
              >
                <Icon name={item.icon} />
                {item.label}
              </Link>
              {item.children && (
                <button
                  type="button"
                  className="header-menu-toggle"
                  aria-label={`${expanded ? "收起" : "展开"}${item.label}子菜单`}
                  aria-expanded={expanded}
                  aria-controls={panelId}
                  onClick={() => {
                    cancelLeave();
                    setOpened(expanded ? null : item.href);
                  }}
                >
                  <Icon name="chevron" />
                </button>
              )}
            </div>
            {item.children && (
              <div
                id={panelId}
                className="header-submenu"
                inert={!expanded}
                aria-hidden={!expanded}
              >
                <div className="header-submenu-surface">
                  {item.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      aria-current={
                        navigationIsActive(pathname, child.href)
                          ? "page"
                          : undefined
                      }
                      {...navigationTarget(child.href)}
                      onClick={close}
                    >
                      <span className="submenu-icon">
                        <Icon name={child.icon} />
                      </span>
                      <span>
                        <strong>{child.label}</strong>
                        <small>{child.description}</small>
                      </span>
                      {navigationTarget(child.href).target && (
                        <Icon name="external" className="external-mark" />
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}
