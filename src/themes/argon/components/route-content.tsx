"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { clientNavigationHref } from "@/core/navigation/targets";
import { useRouteState } from "./route-state";
import { useMotion } from "../hooks/use-motion";

function homeFeedLead() {
  return Math.max(800, Math.round(window.innerHeight * 1.5));
}

export function RouteContent({ children }: { children: ReactNode }) {
  const { route, pending, navigate } = useRouteState();
  const { enabled } = useMotion();
  const home = route === "/" || route.startsWith("/?");
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (!home || !element || !("IntersectionObserver" in window)) return;
    const lead = homeFeedLead();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          (entry.target as HTMLImageElement).loading = "eager";
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: `${lead}px 0px ${lead}px` },
    );
    element
      .querySelectorAll<HTMLImageElement>(
        '.post-cover img[loading="lazy"], .shuoshuo-card img[loading="lazy"]',
      )
      .forEach((image) => observer.observe(image));
    return () => observer.disconnect();
  }, [route, children, home]);
  useEffect(() => {
    const element = container.current;
    if (!element || !("IntersectionObserver" in window) || !enabled) return;
    const lead = home ? homeFeedLead() : 24;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            const alreadyInView =
              entry.boundingClientRect.top < window.innerHeight &&
              entry.boundingClientRect.bottom > 0;
            (entry.target as HTMLElement).dataset.revealState =
              home && alreadyInView ? "immediate" : "visible";
            observer.unobserve(entry.target);
          }
      },
      {
        rootMargin: home ? `${lead}px 0px ${lead}px` : "0px 0px 24px",
        threshold: home ? 0 : 0.05,
      },
    );
    const waiting: HTMLElement[] = [];
    element
      .querySelectorAll<HTMLElement>(
        ".post-card, .shuoshuo-card, .archive-month",
      )
      .forEach((item) => {
        if (
          !item.dataset.revealState &&
          item.getBoundingClientRect().top > window.innerHeight + lead
        ) {
          item.dataset.revealState = "pending";
          waiting.push(item);
          observer.observe(item);
        }
      });
    return () => {
      observer.disconnect();
      waiting.forEach((item) => {
        if (item.dataset.revealState === "pending")
          delete item.dataset.revealState;
      });
    };
  }, [route, children, enabled, home]);
  function onClick(event: MouseEvent<HTMLDivElement>) {
    if (event.defaultPrevented || !(event.target instanceof Element)) return;
    const anchor = event.target.closest<HTMLAnchorElement>(
      ".article-content a[href]",
    );
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    const href = clientNavigationHref(window.location.href, anchor.href, {
      button: event.button,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      target: anchor.target,
      download: anchor.hasAttribute("download"),
      external: anchor.relList.contains("external"),
    });
    if (!href) return;
    event.preventDefault();
    navigate(href);
  }
  return (
    <div
      ref={container}
      key={route}
      className="route-transition"
      data-home-feed={home || undefined}
      data-state={pending ? "pending" : "entering"}
      aria-busy={pending}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
