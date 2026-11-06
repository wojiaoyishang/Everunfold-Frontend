"use client";
import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { useT } from "@/core/i18n/provider";

/** Keep one live set of controls while moving its portal host between the page and shell. */
export function ScrollHeaderActions({
  children,
  className,
}: {
  children: ReactNode;
  className: string;
}) {
  const t = useT();
  const home = useRef<HTMLDivElement | null>(null);
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const mount = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    home.current = element;
    const host = document.createElement("div");
    hostRef.current = host;
    element.append(host);
    setContainer(host);
    return () => {
      host.remove();
      home.current = null;
      hostRef.current = null;
    };
  }, []);

  useLayoutEffect(() => {
    const origin = home.current;
    const host = hostRef.current;
    const shell = origin?.closest<HTMLElement>(".admin-shell");
    const header = shell?.querySelector<HTMLElement>(".admin-header");
    const target = header?.querySelector<HTMLElement>(
      "[data-admin-header-dock]",
    );
    if (!host || !origin || !header || !target) return;
    if (!host.isConnected) origin.append(host);
    let docked = false;
    let frame = 0;
    const update = () => {
      frame = 0;
      const edge = header.getBoundingClientRect().bottom;
      const top = origin.getBoundingClientRect().top;
      // A small return margin prevents repeated transfers around a fractional scroll boundary.
      const next = docked ? top < edge + 8 : top <= edge;
      if (next === docked) return;
      if (next) {
        const bounds = origin.getBoundingClientRect();
        origin.style.width = `${bounds.width}px`;
        origin.style.height = `${bounds.height}px`;
      }
      const focused = host.contains(document.activeElement)
        ? (document.activeElement as HTMLElement)
        : null;
      // The portal destination stays constant, preserving pending requests and component state.
      (next ? target : origin).append(host);
      docked = next;
      host.dataset.docked = String(next);
      if (!next) {
        origin.style.width = "";
        origin.style.height = "";
      }
      if (focused && document.activeElement !== focused)
        focused.focus({ preventScroll: true });
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    const observer = new ResizeObserver(() => {
      shell?.style.setProperty(
        "--admin-header-height",
        `${header.getBoundingClientRect().height}px`,
      );
      // A compact header uses a second row; keep the editor's sticky inspector below it.
      const extra = Math.max(
        0,
        target.getBoundingClientRect().bottom -
          header.getBoundingClientRect().bottom,
      );
      shell?.style.setProperty("--admin-header-dock-height", `${extra}px`);
      schedule();
    });
    observer.observe(origin);
    observer.observe(header);
    observer.observe(host);
    observer.observe(target);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
      cancelAnimationFrame(frame);
      // Remove only this page's host; the persistent shell slot is left empty on navigation.
      host.remove();
      shell?.style.removeProperty("--admin-header-dock-height");
      shell?.style.removeProperty("--admin-header-height");
    };
  }, [container]);

  return (
    <div ref={mount} className="admin-header-dock-home">
      {container &&
        createPortal(
          <div
            className={`admin-header-dock-controls ${className}`}
            role="group"
            aria-label={t("编辑操作")}
          >
            {children}
          </div>,
          container,
        )}
    </div>
  );
}
