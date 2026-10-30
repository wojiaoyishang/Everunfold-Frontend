"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";

import type { Site } from "@/core/content/types";
import { publicHref, resourceUrl } from "@/core/content/urls";
import type { TableOfContentsItem } from "@/core/rendering/content";
import { Icon, type IconName } from "./icon";
import { ThemeToggle } from "./controls";
import { useNavigation } from "./navigation-state";

function subscribeScroll(listener: () => void) {
  window.addEventListener("scroll", listener, { passive: true });
  return () => window.removeEventListener("scroll", listener);
}

const defaultNavigation: { label: string; href: string; icon: IconName }[] = [
  { label: "首页", href: "/", icon: "home" },
  { label: "文章归档", href: "/archives", icon: "archive" },
  { label: "文章分类", href: "/categories", icon: "folder" },
  { label: "标签", href: "/tags", icon: "tag" },
];

function navigation(site: Site) {
  return site.navigation.length
    ? site.navigation.flatMap((item) => {
        const href = publicHref(item.href);
        return href
          ? [
              {
                ...item,
                href,
                icon: (Object.hasOwn(
                  {
                    home: 1,
                    archive: 1,
                    folder: 1,
                    tag: 1,
                    user: 1,
                    book: 1,
                    link: 1,
                  },
                  item.icon ?? "",
                )
                  ? item.icon
                  : "link") as IconName,
              },
            ]
          : [];
      })
    : defaultNavigation;
}

export function SiteHeader({ site }: { site: Site }) {
  const { open, setOpen, triggerRef } = useNavigation();
  const scrolled = useSyncExternalStore(
    subscribeScroll,
    () => window.scrollY > 80,
    () => false,
  );
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
          <Icon name="campfire" />
          <span>{site.hero_title || site.name}</span>
        </Link>
        <nav className="header-navigation" aria-label="顶部导航">
          {navigation(site)
            .slice(0, 5)
            .map((item) => (
              <Link key={`${item.href}-${item.label}`} href={item.href}>
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
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function Sidebar({
  site,
  toc = [],
}: {
  site: Site;
  toc?: TableOfContentsItem[];
}) {
  const { open, setOpen, triggerRef } = useNavigation();
  const [tab, setTab] = useState(toc.length ? "toc" : "overview");
  const sidebarRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    const trigger = triggerRef.current;
    const previousOverflow = document.body.style.overflow;
    const desktop = window.matchMedia("(min-width: 901px)");
    const onViewportChange = () => {
      if (desktop.matches) setOpen(false);
    };
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
      if (event.key !== "Tab") return;
      const focusable = sidebarRef.current?.querySelectorAll<HTMLElement>(
        "a[href], button, input",
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onViewportChange);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onViewportChange);
      trigger?.focus();
    };
  }, [open, setOpen, triggerRef]);
  const avatar = resourceUrl(site.avatar_url);
  return (
    <>
      {open && (
        <button
          type="button"
          className="sidebar-mask"
          aria-label="关闭站点侧栏"
          onClick={() => setOpen(false)}
        />
      )}
      <aside
        ref={sidebarRef}
        id="site-sidebar"
        className={`site-sidebar ${open ? "is-open" : ""}`}
        aria-label="站点导航和概览"
      >
        <button
          ref={closeRef}
          className="sidebar-close icon-button"
          aria-label="关闭侧栏"
          onClick={() => setOpen(false)}
        >
          <Icon name="close" />
        </button>
        <section className="surface sidebar-menu-card">
          <div className="sidebar-banner">
            <span>{site.hero_title || site.name}</span>
            <small>{site.description}</small>
          </div>
          <nav className="sidebar-navigation" aria-label="侧栏导航">
            {navigation(site).map((item) => (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <form action="/search" method="get" className="sidebar-search">
            <Icon name="search" />
            <input
              aria-label="搜索文章"
              name="q"
              placeholder="搜索什么…"
              maxLength={160}
            />
          </form>
        </section>
        <section className="surface sidebar-overview">
          <div className="sidebar-tabs" role="tablist" aria-label="侧栏内容">
            {toc.length > 0 && (
              <button
                id="toc-tab"
                role="tab"
                aria-controls="toc-panel"
                aria-selected={tab === "toc"}
                onClick={() => setTab("toc")}
              >
                文章目录
              </button>
            )}
            <button
              id="overview-tab"
              role="tab"
              aria-controls="overview-panel"
              aria-selected={tab === "overview"}
              onClick={() => setTab("overview")}
            >
              站点概览
            </button>
          </div>
          {tab === "toc" && toc.length > 0 ? (
            <nav
              id="toc-panel"
              role="tabpanel"
              aria-labelledby="toc-tab"
              className="table-of-contents"
              aria-label="文章目录"
            >
              {toc.map((entry) => (
                <a
                  key={entry.id}
                  href={`#${entry.id}`}
                  style={{
                    paddingLeft: `${Math.max(0, entry.level - 2) * 12 + 10}px`,
                  }}
                  onClick={() => setOpen(false)}
                >
                  {entry.text}
                </a>
              ))}
            </nav>
          ) : (
            <div
              id="overview-panel"
              role="tabpanel"
              aria-labelledby="overview-tab"
              className="profile"
            >
              {avatar ? (
                <Image
                  src={avatar}
                  alt={`${site.author} 的头像`}
                  width={92}
                  height={92}
                  className="profile-avatar"
                  unoptimized
                />
              ) : (
                <div className="profile-avatar avatar-placeholder">
                  <Icon name="campfire" />
                </div>
              )}
              <h2>{site.author}</h2>
              <p>{site.description}</p>
              <div className="site-stats">
                <Link href="/archives">
                  <strong>{site.stats.articles}</strong>
                  <span>文章</span>
                </Link>
                <Link href="/categories">
                  <strong>{site.stats.categories}</strong>
                  <span>分类</span>
                </Link>
                <Link href="/tags">
                  <strong>{site.stats.tags}</strong>
                  <span>标签</span>
                </Link>
              </div>
              <div className="profile-links">
                <Link href="/archives">
                  <Icon name="archive" />
                  文章归档
                </Link>
                <Link href="/search">
                  <Icon name="search" />
                  站内搜索
                </Link>
              </div>
            </div>
          )}
        </section>
        <div className="sidebar-note">每一个故事，都仍在展开。</div>
      </aside>
    </>
  );
}
