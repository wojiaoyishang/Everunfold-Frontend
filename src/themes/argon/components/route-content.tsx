"use client";

import { useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { clientNavigationHref } from "@/core/navigation/targets";
import { useRouteState } from "./route-state";

export function RouteContent({ children }: { children: ReactNode }) {
  const { route, pending, navigate } = useRouteState();
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = container.current;
    if (
      !element ||
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries)
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealState = "visible";
            observer.unobserve(entry.target);
          }
      },
      { rootMargin: "0px 0px 24px 0px", threshold: 0.05 },
    );
    const waiting: HTMLElement[] = [];
    element
      .querySelectorAll<HTMLElement>(".post-card, .archive-month")
      .forEach((item) => {
        if (item.getBoundingClientRect().top > window.innerHeight + 24) {
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
  }, [route, children]);
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
      data-state={pending ? "pending" : "entering"}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
