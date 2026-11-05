"use client";
import { UiText } from "@/core/i18n/provider";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TextLink } from "../../components/ui/primitives";
import styles from "./section-navigation.module.css";

type SectionLink = { id: string; title: string };

/** Builds a local directory from the sections actually mounted in this page. */
export function SettingsLayout({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  const [sections, setSections] = useState<SectionLink[]>([]);
  const [active, setActive] = useState("");
  useEffect(() => {
    const page = root.current;
    if (!page) return;
    const header = page.closest(".admin-root")?.querySelector(".admin-header");
    let frame = 0;
    let restored = false;
    const read = () => {
      frame = 0;
      const nodes = [
        ...page.querySelectorAll<HTMLElement>("[data-settings-section][id]"),
      ];
      const links = nodes.map((node) => ({
        id: node.id,
        title: node.dataset.settingsSection ?? "",
      }));
      setSections((previous) =>
        previous.length === links.length &&
        previous.every(
          (item, index) =>
            item.id === links[index].id && item.title === links[index].title,
        )
          ? previous
          : links,
      );
      if (!restored && nodes.length) {
        restored = true;
        const target = nodes.find((node) => "#" + node.id === location.hash);
        target?.scrollIntoView({ block: "start", behavior: "instant" });
        target?.focus({ preventScroll: true });
      }
      const boundary = (header?.getBoundingClientRect().bottom ?? 56) + 24;
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
    const mutations = new MutationObserver(schedule);
    mutations.observe(page, { subtree: true, childList: true });
    const resize = new ResizeObserver(schedule);
    resize.observe(page);
    if (header) resize.observe(header);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      mutations.disconnect();
      resize.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("hashchange", schedule);
    };
  }, []);
  return (
    <div ref={root} className={`admin-settings-page ${styles.layout}`}>
      <div className={styles.main}>{children}</div>
      {sections.length > 1 && (
        <nav className={styles.navigation} aria-label="设置分区导航">
          <strong>
            <UiText text="快速导航" />
          </strong>
          {sections.map((section) => (
            <TextLink
              key={section.id}
              href={`#${section.id}`}
              aria-current={active === section.id ? "location" : undefined}
            >
              {section.title}
            </TextLink>
          ))}
        </nav>
      )}
    </div>
  );
}
