"use client";
import { Button } from "@/themes/argon/components/ui/primitives";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import type { Site } from "@/core/content/types";
import {
  siteNavigation,
  navigationIsActive,
  navigationTarget,
  type NavigationItem,
} from "../navigation";
import { AppLink as Link } from "./navigation-link";
import { useNavigation } from "./navigation-state";
import { Icon } from "./icon";

function MenuItem({ item }: { item: NavigationItem }) {
  const [choice, setChoice] = useState<{
    path: string;
    expanded: boolean;
  } | null>(null);
  const { setOpen } = useNavigation();
  const id = useId();
  const pathname = usePathname().replace(/\/$/, "");
  const active = (href: string) => navigationIsActive(pathname || "/", href);
  const expanded =
    choice?.path === pathname
      ? choice.expanded
      : !!item.children?.some((child) => active(child.href));
  return (
    <div className="sidebar-menu-item">
      <div className="sidebar-menu-row">
        <Link
          href={item.href}
          {...navigationTarget(item.href)}
          aria-current={active(item.href) ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
        {item.children && (
          <Button
            type="button"
            aria-label={`${expanded ? "收起" : "展开"}${item.label}`}
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setChoice({ path: pathname, expanded: !expanded })}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.stopPropagation();
                setChoice({ path: pathname, expanded: false });
              }
            }}
          >
            <Icon name="chevron" />
          </Button>
        )}
      </div>
      {item.children && (
        <div
          id={id}
          className="sidebar-submenu"
          data-open={expanded}
          inert={!expanded}
          aria-hidden={!expanded}
        >
          <div>
            {item.children.map((child) => (
              <Link
                key={child.href}
                href={child.href}
                {...navigationTarget(child.href)}
                aria-current={active(child.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon name={child.icon} />
                {child.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function SidebarNavigation({ site }: { site: Site }) {
  return (
    <nav className="sidebar-navigation" aria-label="侧栏导航">
      {siteNavigation(site).map((item) => (
        <MenuItem key={item.href} item={item} />
      ))}
    </nav>
  );
}
