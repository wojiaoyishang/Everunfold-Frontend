"use client";
import type { Site } from "@/core/content/types";
import { siteNavigation } from "../navigation";
import { useNavigation } from "./navigation-state";
import { NavigationBranch } from "./navigation-branch";
export function SidebarNavigation({ site }: { site: Site }) {
  const { setOpen } = useNavigation();
  return (
    <nav className="sidebar-navigation" aria-label="侧栏导航">
      {siteNavigation(site).map((item, index) => (
        <NavigationBranch
          key={item.id ?? `${item.href}-${index}`}
          item={item}
          onNavigate={() => setOpen(false)}
        />
      ))}
    </nav>
  );
}
