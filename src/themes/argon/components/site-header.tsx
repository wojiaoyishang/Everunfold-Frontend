"use client";

import type { Site } from "@/core/content/types";
import { usePathname } from "next/navigation";
import { siteNavigation } from "../navigation";
import { useScrollPosition } from "../hooks/use-scroll-position";
import { AppLink as Link } from "./navigation-link";
import { useNavigation } from "./navigation-state";
import { Icon } from "./icon";

export function SiteHeader({ site }: { site: Site }) {
  const { open, setOpen, triggerRef } = useNavigation();
  const scrolled = useScrollPosition() > 80;
  const pathname = usePathname();
  return (
    <header className={`site-header ${scrolled ? "is-scrolled" : ""}`}>
      <button
        ref={triggerRef}
        type="button"
        className="mobile-sidebar-button"
        aria-label="打开站点侧栏"
        aria-expanded={open}
        aria-controls="site-sidebar"
        onClick={() => setOpen(true)}
      >
        <Icon name="menu" />
      </button>
      <div className="header-inner">
        <Link href="/" className="site-brand">
          <span>{site.hero_title || site.name}</span>
        </Link>
        <nav className="header-navigation" aria-label="顶部导航">
          {siteNavigation(site).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={
                pathname.replace(/\/$/, "") === item.href.replace(/\/$/, "")
                  ? "page"
                  : undefined
              }
            >
              <Icon name={item.icon} />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="header-actions">
          <Link
            href="/search"
            className="icon-button"
            aria-label="搜索文章"
            title="搜索文章"
          >
            <Icon name="search" />
          </Link>
        </div>
      </div>
    </header>
  );
}
