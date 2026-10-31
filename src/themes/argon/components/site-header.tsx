"use client";
import { Button } from "@/themes/argon/components/ui/primitives";

import type { Site } from "@/core/content/types";
import { useScrollPosition } from "../hooks/use-scroll-position";
import { AppLink as Link } from "./navigation-link";
import { useNavigation } from "./navigation-state";
import { Icon } from "./icon";
import { HeaderNavigation } from "./header-navigation";
import { SearchDialog } from "./search-dialog";
import { NavigationProgress } from "./navigation-progress";
import { BackendStatus } from "./backend-status";

export function SiteHeader({ site }: { site: Site }) {
  const { open, setOpen, triggerRef } = useNavigation();
  const scrolled = useScrollPosition() > 80;
  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <Button
        ref={triggerRef}
        type="button"
        className="mobile-sidebar-button"
        aria-label="打开站点侧栏"
        aria-expanded={open}
        aria-controls="site-sidebar"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </Button>
      <div className="header-inner">
        <Link href="/" className="site-brand">
          <span>{site.hero_title || site.name}</span>
        </Link>
        <HeaderNavigation site={site} />
        <div className="header-actions">
          <BackendStatus />
          <SearchDialog />
        </div>
      </div>
      <NavigationProgress />
    </header>
  );
}
