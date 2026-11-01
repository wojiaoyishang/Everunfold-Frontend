"use client";
import "./navigation-branch.css";
import { useId, useState, type CSSProperties } from "react";
import { usePathname } from "next/navigation";
import {
  navigationIsActive,
  navigationTarget,
  type NavigationItem,
} from "../navigation";
import { AppLink } from "./navigation-link";
import { LibraryIcon } from "./library-icon";
import { Button } from "./ui/primitives";
import { Icon } from "./icon";
function hasActive(item: NavigationItem, path: string): boolean {
  return (
    navigationIsActive(path, item.href) ||
    !!item.children?.some((child) => hasActive(child, path))
  );
}
/** Recursive disclosure content for the header dropdown only. */
export function NavigationBranch({
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
  const [choice, setChoice] = useState<{ path: string; open: boolean } | null>(
    null,
  );
  const open =
    choice?.path === path
      ? choice.open
      : !!item.children?.some((child) => hasActive(child, path));
  return (
    <div
      className="navigation-branch"
      style={{ "--navigation-depth": Math.min(depth, 4) } as CSSProperties}
    >
      <div className="navigation-branch-row">
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
        {!!item.children?.length && (
          <Button
            className="navigation-branch-toggle"
            aria-label={`${open ? "收起" : "展开"}${item.label}子菜单`}
            aria-expanded={open}
            aria-controls={id}
            onClick={() => setChoice({ path, open: !open })}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setChoice({ path, open: false });
              }
            }}
          >
            <Icon name="chevron" />
          </Button>
        )}
      </div>
      {!!item.children?.length && (
        <div id={id} className="navigation-branch-children" hidden={!open}>
          {item.children.map((child, index) => (
            <NavigationBranch
              key={child.id ?? `${child.href}-${index}`}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      )}
    </div>
  );
}
