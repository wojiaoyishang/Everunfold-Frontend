"use client";
import { useRef } from "react";
import type { Site } from "@/core/content/types";
import { siteNavigation } from "../navigation";
import { useNavigation } from "./navigation-state";
import { SidebarFlyout } from "./sidebar-flyout";
import { SidebarMobileBranch } from "./sidebar-mobile-navigation";
export function SidebarNavigation({ site }: { site: Site }) {
  const root = useRef<HTMLElement>(null);
  const { setOpen } = useNavigation();
  const items = siteNavigation(site);
  const onNavigate = () => {
    root.current
      ?.querySelectorAll<HTMLElement>("[popover]:popover-open")
      .forEach((panel) => panel.hidePopover());
    setOpen(false);
  };
  return (
    <nav ref={root} className="sidebar-navigation" aria-label="侧栏导航">
      <div className="sidebar-navigation-desktop">
        {items.map((item, index) => (
          <SidebarFlyout
            key={item.id ?? `${item.href}-${index}`}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className="sidebar-navigation-mobile">
        {items.map((item, index) => (
          <SidebarMobileBranch
            key={item.id ?? `${item.href}-${index}`}
            item={item}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </nav>
  );
}
