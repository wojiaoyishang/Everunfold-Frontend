"use client";

import { useId, useState } from "react";
import { usePathname } from "next/navigation";
import type { Site } from "@/core/content/types";
import { siteNavigation, type NavigationItem } from "../navigation";
import { AppLink as Link } from "./navigation-link";
import { useNavigation } from "./navigation-state";
import { Icon } from "./icon";

function MenuItem({ item }: { item: NavigationItem }) {
  const [expanded, setExpanded] = useState(false);
  const { setOpen } = useNavigation();
  const id = useId();
  const pathname = usePathname().replace(/\/$/, "");
  const active = (href: string) => pathname === href.replace(/\/$/, "");
  return (
    <div className="sidebar-menu-item">
      <div className="sidebar-menu-row">
        <Link
          href={item.href}
          aria-current={active(item.href) ? "page" : undefined}
          onClick={() => setOpen(false)}
        >
          <Icon name={item.icon} />
          <span>{item.label}</span>
        </Link>
        {item.children && (
          <button
            type="button"
            aria-label={`${expanded ? "收起" : "展开"}${item.label}`}
            aria-expanded={expanded}
            aria-controls={id}
            onClick={() => setExpanded(!expanded)}
          >
            <Icon name="chevron" />
          </button>
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
                aria-current={active(child.href) ? "page" : undefined}
                onClick={() => setOpen(false)}
              >
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
