"use client";
import { UiText, useT } from "@/core/i18n/provider";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TextLink } from "../../components/ui/primitives";
import styles from "./section-navigation.module.css";
import { adminScrollBehavior } from "@/core/admin/scroll";

type SectionLink = { id: string; title: string; group?: string };
type SectionGroup = { title?: string; items: SectionLink[] };

function groupSections(sections: SectionLink[]): SectionGroup[] {
  return sections.reduce<SectionGroup[]>((groups, section) => {
    const current = groups.at(-1);
    if (current && current.title === section.group) {
      current.items.push(section);
    } else {
      groups.push({ title: section.group, items: [section] });
    }
    return groups;
  }, []);
}

/** Builds a local directory from the sections actually mounted in this page. */
export function SettingsLayout({
  children,
  fullWidth = false,
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  const t = useT();
  const root = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<SectionLink[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const header = page.closest(".admin-root")?.querySelector(".admin-header");
    let frame = 0;
    let restored = false;
    let settleUntil = 0;
    const read = () => {
      frame = 0;
      const nodes = [
        ...page.querySelectorAll<HTMLElement>("[data-settings-section][id]"),
      ];
      const links = nodes.map((node) => ({
        id: node.id,
        title: node.dataset.settingsSection ?? "",
        group: node.dataset.settingsGroup || undefined,
      }));
      setSections((previous) =>
        previous.length === links.length &&
        previous.every(
          (item, index) =>
            item.id === links[index].id &&
            item.title === links[index].title &&
            item.group === links[index].group,
        )
          ? previous
          : links,
      );
      const hashTarget = location.hash
        ? nodes.find((node) => "#" + node.id === location.hash)
        : undefined;
      const boundary = (header?.getBoundingClientRect().bottom ?? 56) + 24;
      if (!restored && nodes.length && (!location.hash || hashTarget)) {
        restored = true;
        hashTarget?.scrollIntoView({ block: "start", behavior: "instant" });
        hashTarget?.focus({ preventScroll: true });
        if (hashTarget) settleUntil = performance.now() + 1500;
      } else if (
        settleUntil &&
        performance.now() < settleUntil &&
        hashTarget === document.activeElement &&
        Math.abs(hashTarget.getBoundingClientRect().top - boundary) > 24
      ) {
        // Async sections above the target can change layout after the first
        // jump. Keep the requested anchor aligned until layout settles or the
        // user starts interacting.
        hashTarget.scrollIntoView({ block: "start", behavior: "instant" });
      }
      const end =
        window.scrollY > 0 &&
        Math.ceil(window.scrollY + window.innerHeight) >=
          document.documentElement.scrollHeight - 2;
      // A short section may stop above the page end without reaching the header.
      // Keep the visible anchor target selected instead of its next neighbour.
      const focused = end
        ? nodes.find(
            (node) =>
              node === document.activeElement &&
              node.getBoundingClientRect().top >= boundary - 24 &&
              node.getBoundingClientRect().top < window.innerHeight,
          )
        : undefined;
      const current = end
        ? (focused ?? nodes.at(-1))
        : nodes.findLast(
            (node) => node.getBoundingClientRect().top <= boundary + 1,
          );
      setActive(current?.id ?? nodes[0]?.id ?? "");
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(read);
    };
    const stopSettling = () => {
      settleUntil = 0;
    };
    const mutations = new MutationObserver(schedule);
    mutations.observe(page, { subtree: true, childList: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(page);
    if (header) resize.observe(header);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    window.addEventListener("wheel", stopSettling, { passive: true });
    window.addEventListener("touchstart", stopSettling, { passive: true });
    window.addEventListener("pointerdown", stopSettling, { passive: true });
    window.addEventListener("keydown", stopSettling);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
      window.removeEventListener("wheel", stopSettling);
      window.removeEventListener("touchstart", stopSettling);
      window.removeEventListener("pointerdown", stopSettling);
      window.removeEventListener("keydown", stopSettling);
    };
  }, []);
  const groups = groupSections(sections);
  return (
    <div
      ref={root}
      className={`admin-settings-page ${styles.layout}`}
      data-full-width={fullWidth}
    >
      <div className={styles.main}>{children}</div>
      {!fullWidth && sections.length > 1 && (
        <nav className={styles.navigation} aria-label={t("设置分区导航")}>
          <strong>
            <UiText text="快速导航" />
          </strong>
          {groups.map((group) => (
            <div
              className={styles.group}
              data-labelled={Boolean(group.title)}
              data-active={
                group.items.some((section) => section.id === active)
                  ? "true"
                  : undefined
              }
              key={`${group.title ?? ""}:${group.items[0].id}`}
            >
              {group.title && (
                <span className={styles.groupTitle}>
                  <UiText text={group.title} />
                </span>
              )}
              <div className={styles.links}>
                {group.items.map((section) => (
                  <TextLink
                    key={section.id}
                    href={`#${section.id}`}
                    aria-current={
                      active === section.id ? "location" : undefined
                    }
                    onClick={(event) => {
                      if (
                        event.button !== 0 ||
                        event.metaKey ||
                        event.ctrlKey ||
                        event.shiftKey ||
                        event.altKey
                      )
                        return;
                      const target = document.getElementById(section.id);
                      if (!target) return;
                      event.preventDefault();
                      history.replaceState(history.state, "", `#${section.id}`);
                      target.focus({ preventScroll: true });
                      target.scrollIntoView({
                        block: "start",
                        behavior: adminScrollBehavior(root.current),
                      });
                    }}
                  >
                    <UiText text={section.title} />
                  </TextLink>
                ))}
              </div>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
