"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import sanitizeHtml from "sanitize-html";
import type { PageInjection } from "@/core/contracts/settings";
import {
  matchesPageInjection,
  type InjectionPageType,
  type PageInjectionSurface,
} from "./matching";

const marker = "[data-page-injection-kind]";
const topMenuMarker = "[data-site-top-menu]";

export function PageInjectionRuntime({
  rules,
  surface,
}: {
  rules: readonly PageInjection[];
  surface: PageInjectionSurface;
}) {
  const pathname = usePathname();
  const query = useSearchParams().toString();
  const route = pathname + "?" + query;
  const [meta, setMeta] = useState<{
    route: string;
    type: InjectionPageType;
    topMenu: boolean;
  }>();
  const observe = surface === "public" && rules.length > 0;
  useEffect(() => {
    if (!observe) return;
    const root = document.querySelector('[data-surface="public"]');
    if (!root) return;
    let pending = false;
    let disposed = false;
    const read = () => {
      pending = false;
      if (disposed) return;
      const node = root.querySelector<HTMLElement>(marker);
      const type = (node?.dataset.pageInjectionKind || "") as InjectionPageType;
      const topMenu = root.querySelector(topMenuMarker) !== null;
      setMeta((old) =>
        old?.route === route && old.type === type && old.topMenu === topMenu
          ? old
          : { route, type, topMenu },
      );
    };
    const schedule = () => {
      if (pending) return;
      pending = true;
      queueMicrotask(read);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-page-injection-kind", "data-site-top-menu"],
    });
    schedule();
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [observe, route]);

  if (surface === "public" && (meta?.route !== route || !meta.type))
    return null;
  const type = surface === "public" ? (meta?.type ?? "") : surface;
  return rules
    .filter((rule) =>
      matchesPageInjection(rule, {
        surface,
        type,
        path: pathname,
        topMenu: Boolean(meta?.topMenu),
      }),
    )
    .map((rule) => (
      <ActiveInjection
        key={JSON.stringify([route, rule.id])}
        rule={rule}
        pathname={pathname}
      />
    ));
}

function ActiveInjection({
  rule,
  pathname,
}: {
  rule: PageInjection;
  pathname: string;
}) {
  const host = useRef<HTMLDivElement>(null);
  const html = useMemo(
    () =>
      sanitizeHtml(rule.html ?? "", {
        allowedTags: [...sanitizeHtml.defaults.allowedTags, "img"],
        allowedAttributes: {
          "*": ["class", "id", "title", "aria-*", "data-*"],
          a: ["href", "rel", "target"],
          img: ["src", "alt", "width", "height", "loading"],
        },
        allowedSchemes: ["https", "http", "mailto", "tel"],
        allowProtocolRelative: false,
        transformTags: {
          a: (tagName, attributes) => ({
            tagName,
            attribs:
              attributes.target === "_blank"
                ? { ...attributes, rel: "noopener noreferrer" }
                : attributes,
          }),
        },
      }),
    [rule.html],
  );
  useEffect(() => {
    if (!rule.css?.trim()) return;
    const style = document.createElement("style");
    style.dataset.pageInjectionStyle = rule.id;
    style.textContent = rule.css;
    document.head.append(style);
    return () => style.remove();
  }, [rule.css, rule.id]);

  useEffect(() => {
    if (!rule.javascript?.trim() || !host.current) return;
    const element = document.createElement("script");
    element.dataset.pageInjectionScript = rule.id;
    // DOM text nodes avoid HTML raw-text boundaries. Each rule gets its own scope.
    element.textContent =
      "(() => { const script = document.currentScript; try { " +
      "(function(context) { 'use strict';\n" +
      rule.javascript +
      "\n}).call(undefined, Object.freeze({ pathname: " +
      JSON.stringify(pathname) +
      ", root: script.parentElement, onCleanup(callback) { if (typeof callback === 'function') " +
      "script.addEventListener('everunfold:dispose', callback, {once: true}); }})); " +
      "} catch(error) { console.error('[Everunfold page injection]', error); } })();";
    host.current.append(element);
    return () => {
      element.dispatchEvent(new Event("everunfold:dispose"));
      element.remove();
    };
  }, [pathname, rule.html, rule.javascript, rule.id]);

  return (
    <div
      ref={host}
      data-page-injection-rule={rule.id}
      style={{ display: "contents" }}
    >
      {html && <div dangerouslySetInnerHTML={{ __html: html }} />}
    </div>
  );
}
