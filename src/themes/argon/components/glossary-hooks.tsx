"use client";

import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  loadGlossaryHooks,
  type GlossaryRuntimeOptions,
} from "@/core/glossary/runtime";
import { useLocale } from "@/core/i18n/provider";
import { useReaderBaseUrl } from "./reader-data";
import { useRouteState } from "./route-state";
const GlossaryTooltips = lazy(() => import("./glossary-tooltips"));

type PublicHook = NonNullable<
  GlossaryContract["public_hooks"]["data"]
>["hooks"][number];

const MAX_TARGETS = 20;
const popupId = "glossary-hook-tooltip";
const nativeFocusable =
  "a[href],button,input,select,textarea,summary,[tabindex]";
const ignored =
  ".glossary-term,[data-glossary-hook],[data-glossary-ignore],.glossary-tooltip,.glossary-tooltip *,.glossary-footnotes";

function targetFor(
  pathname: string,
  presentationId: string,
): {
  surface: "article" | "shuoshuo" | "page" | "code";
  content_id?: string;
  page_id?: string;
} {
  const page = /^page:([0-9a-f-]{36})(?::|$)/i.exec(presentationId);
  if (page) return { surface: "page", page_id: page[1] };
  if (
    pathname === "/glossary" ||
    pathname.startsWith("/glossary/") ||
    !/^[0-9a-f-]{36}$/i.test(presentationId)
  )
    return { surface: "code" };
  return {
    surface:
      typeof document !== "undefined" &&
      document.querySelector(".shuoshuo-detail")
        ? "shuoshuo"
        : "article",
    content_id: presentationId,
  };
}

function orderedHooks(hooks: readonly PublicHook[]) {
  return [...hooks].sort(
    (a, b) =>
      Number(b.scope === "content") - Number(a.scope === "content") ||
      b.priority - a.priority ||
      a.id.localeCompare(b.id),
  );
}

/**
 * Page selectors are independent from article keyword matching. Targets are
 * marked only inside the public theme and never cross iframe/shadow boundaries.
 */
export function GlossaryHooks() {
  const { route, presentationId, presentationReady, site } = useRouteState();
  const { locale: uiLocale } = useLocale();
  const baseUrl = useReaderBaseUrl();
  const root = useRef<HTMLElement | null>(null);
  const [hooks, setHooks] = useState<readonly PublicHook[]>([]);
  const pathname = route.split("?", 1)[0];
  const target = useMemo(
    () => targetFor(pathname, presentationId),
    [pathname, presentationId],
  );
  const language = site.locale ?? uiLocale;
  const terms = useMemo(() => hooks.map((hook) => hook.term), [hooks]);
  const options = useMemo<GlossaryRuntimeOptions>(
    () => ({
      auto_match: false,
      max_matches_per_page: 1,
      popup_source: site.settings?.site.glossary?.popup_source ?? "content",
      show_tooltips: true,
      show_footnotes: false,
    }),
    [site.settings?.site.glossary?.popup_source],
  );

  useEffect(() => {
    const container = document.querySelector<HTMLElement>(
      "[data-public-theme]",
    );
    if (!presentationReady) return;
    root.current = container;
    let cancelled = false;
    const start = () => {
      if (cancelled) return;
      void loadGlossaryHooks(baseUrl, { ...target, language })
        .then((value) => {
          if (!cancelled) setHooks(value.hooks);
        })
        .catch(() => {
          if (!cancelled) setHooks([]);
        });
    };
    const idleWindow = window as Window & {
      requestIdleCallback?: Window["requestIdleCallback"];
      cancelIdleCallback?: Window["cancelIdleCallback"];
    };
    const usesIdle = typeof idleWindow.requestIdleCallback === "function";
    const frame = usesIdle
      ? idleWindow.requestIdleCallback!(start, { timeout: 1200 })
      : window.setTimeout(start, 400);
    return () => {
      cancelled = true;
      if (usesIdle) idleWindow.cancelIdleCallback?.(frame);
      else window.clearTimeout(frame);
    };
  }, [baseUrl, language, presentationReady, target]);

  useEffect(() => {
    const container = root.current;
    if (!container || !hooks.length) return;
    let disposed = false;
    let timer: number | null = null;
    let restore: (() => void)[] = [];

    const clear = () => {
      for (const callback of restore) callback();
      restore = [];
    };
    const apply = () => {
      if (disposed) return;
      clear();
      const claimed = new Set<Element>();
      const mount = (element: Element, hook: PublicHook) => {
        if (
          claimed.size >= MAX_TARGETS ||
          claimed.has(element) ||
          element.closest(ignored) ||
          !container.contains(element)
        )
          return;
        claimed.add(element);
        const node = element as HTMLElement;
        const previous = {
          tabindex: node.getAttribute("tabindex"),
          hasPopup: node.getAttribute("aria-haspopup"),
          controls: node.getAttribute("aria-controls"),
          expanded: node.getAttribute("aria-expanded"),
          hookClass: node.classList.contains("glossary-hook-target"),
        };
        if (!node.matches(nativeFocusable)) node.tabIndex = 0;
        node.dataset.glossaryHook = "true";
        node.dataset.glossaryTerm = hook.term.id;
        node.setAttribute("aria-haspopup", "dialog");
        node.setAttribute("aria-controls", popupId);
        node.setAttribute("aria-expanded", "false");
        node.classList.add("glossary-hook-target");
        restore.push(() => {
          delete node.dataset.glossaryHook;
          delete node.dataset.glossaryTerm;
          if (!previous.hookClass)
            node.classList.remove("glossary-hook-target");
          const attributes = {
            tabindex: previous.tabindex,
            "aria-haspopup": previous.hasPopup,
            "aria-controls": previous.controls,
            "aria-expanded": previous.expanded,
          };
          for (const [name, value] of Object.entries(attributes))
            if (value === null) node.removeAttribute(name);
            else node.setAttribute(name, value);
        });
      };
      for (const hook of orderedHooks(hooks)) {
        if (hook.mode === "script") {
          try {
            const api = Object.freeze({
              root: container,
              term: hook.term,
              select: (selector: string) => [
                ...container.querySelectorAll(selector),
              ],
              mount: (element: Element | null) => {
                if (element) mount(element, hook);
              },
            });
            new Function("glossary", `"use strict";\n${hook.script}`)(api);
          } catch {
            /* One invalid mount script never blocks the page or other hooks. */
          }
          continue;
        }
        let targets: Element[];
        try {
          targets = [...container.querySelectorAll(hook.selector)];
        } catch {
          continue;
        }
        for (const element of targets) mount(element, hook);
      }
    };
    apply();
    const observer = new MutationObserver(() => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(apply, 160);
    });
    observer.observe(container, { childList: true, subtree: true });
    return () => {
      disposed = true;
      observer.disconnect();
      if (timer !== null) window.clearTimeout(timer);
      clear();
    };
  }, [hooks, route]);

  if (!hooks.length) return null;
  return (
    <Suspense fallback={null}>
      <GlossaryTooltips
        root={root}
        options={options}
        terms={terms}
        triggerSelector="[data-glossary-hook]"
        preserveNativeClick
        popupId={popupId}
      />
    </Suspense>
  );
}
