"use client";
import { UiText } from "@/core/i18n/provider";

import {
  Button,
  TextField,
  TextLink,
} from "@/themes/argon/components/ui/primitives";

import { useEffect, useRef, useState } from "react";
import { SearchForm } from "./navigation-link";

import type { Site } from "@/core/content/types";
import type { TableOfContentsItem } from "@/core/rendering/content";
import { Icon } from "./icon";
import { campfireIdentity } from "../navigation";
import { SidebarProfile } from "./sidebar-profile";
import { SidebarNavigation } from "./sidebar-navigation";
import { useReadingState } from "./reading-state";
import { useNavigation } from "./navigation-state";
import { TransitionPanel } from "./transition-panel";
import { themeProfile } from "@/core/settings/theme-options";

export function Sidebar({
  site,
  toc = [],
  contentKey,
}: {
  site: Site;
  toc?: TableOfContentsItem[];
  contentKey: string;
}) {
  const { open, setOpen, triggerRef } = useNavigation();
  const [selection, setSelection] = useState<{
    key: string;
    tab: "toc" | "overview";
  } | null>(null);
  const tab =
    selection?.key === contentKey
      ? selection.tab
      : toc.length
        ? "toc"
        : "overview";
  const setTab = (value: "toc" | "overview") =>
    setSelection({ key: contentKey, tab: value });
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
      const focusable = Array.from(
        sidebarRef.current?.querySelectorAll<HTMLElement>(
          "a[href], button, input",
        ) ?? [],
      ).filter(
        (element) =>
          !element.closest("[inert]") && element.offsetParent !== null,
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
  const profile = themeProfile(site.settings);
  const identity = campfireIdentity(site);
  const numberedToc = profile?.article.toc_numbered ?? false;
  const { activeId } = useReadingState();
  useEffect(() => {
    const current = sidebarRef.current?.querySelector<HTMLElement>(
      '.table-of-contents [aria-current="location"]',
    );
    const panel = current?.parentElement;
    if (current && panel) {
      const offset =
        current.getBoundingClientRect().top - panel.getBoundingClientRect().top;
      if (offset < 0 || offset > panel.clientHeight - current.clientHeight)
        panel.scrollTop += offset - panel.clientHeight / 3;
    }
  }, [activeId, tab]);
  return (
    <>
      <Button
        type="button"
        className="sidebar-mask"
        data-open={open}
        inert={!open}
        aria-hidden={!open}
        tabIndex={-1}
        aria-label="关闭站点侧栏"
        onClick={() => setOpen(false)}
      />
      <aside
        ref={sidebarRef}
        id="site-sidebar"
        className={`site-sidebar ${open ? "is-open" : ""}`}
        aria-label="站点导航和概览"
      >
        <Button
          ref={closeRef}
          className="sidebar-close icon-button"
          aria-label="关闭侧栏"
          onClick={() => setOpen(false)}
        >
          <Icon name="close" />
        </Button>
        <section className="surface sidebar-menu-card">
          <div className="sidebar-banner">
            <span>
              {identity.title}
              {identity.alias && (
                <>
                  <br className="sidebar-title-break" />
                  <span className="sidebar-title-alias">{identity.alias}</span>
                </>
              )}
            </span>
            <small>{identity.subtitle}</small>
          </div>
          <SidebarNavigation site={site} />
          <SearchForm className="sidebar-search">
            <Icon name="search" />
            <TextField
              aria-label="搜索文章"
              name="q"
              placeholder="搜索什么…"
              maxLength={160}
            />
          </SearchForm>
        </section>
        <section className="surface sidebar-overview">
          {toc.length > 0 && (
            <div className="sidebar-tabs" role="tablist" aria-label="侧栏内容">
              {toc.length > 0 && (
                <Button
                  id="toc-tab"
                  role="tab"
                  aria-controls="toc-panel"
                  aria-selected={tab === "toc"}
                  onClick={() => setTab("toc")}
                >
                  <UiText text="文章目录" />
                </Button>
              )}
              <Button
                id="overview-tab"
                role="tab"
                aria-controls="overview-panel"
                aria-selected={tab === "overview"}
                onClick={() => setTab("overview")}
              >
                <UiText text="站点概览" />
              </Button>
            </div>
          )}
          {toc.length > 0 && (
            <TransitionPanel
              active={tab === "toc"}
              id="toc-panel"
              labelledBy="toc-tab"
            >
              <nav className="table-of-contents" aria-label="文章目录">
                {toc.map((entry, index) => (
                  <TextLink
                    key={entry.id}
                    href={`#${entry.id}`}
                    aria-current={
                      activeId === entry.id ? "location" : undefined
                    }
                    style={{
                      paddingLeft: `${Math.max(0, entry.level - 2) * 12 + 10}px`,
                    }}
                    onClick={() => setOpen(false)}
                  >
                    {numberedToc && (
                      <span className="toc-number">{index + 1}.</span>
                    )}
                    {entry.text}
                  </TextLink>
                ))}
              </nav>
            </TransitionPanel>
          )}
          <TransitionPanel
            active={!toc.length || tab === "overview"}
            id="overview-panel"
            labelledBy={toc.length ? "overview-tab" : "profile-title"}
            role={toc.length ? "tabpanel" : "region"}
          >
            <SidebarProfile site={site} />
          </TransitionPanel>
        </section>
      </aside>
    </>
  );
}
