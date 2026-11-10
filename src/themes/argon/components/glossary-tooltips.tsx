"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import type { GlossaryContract } from "@/core/contracts/glossary";
import {
  loadGlossaryMatches,
  type GlossaryRuntimeOptions,
} from "@/core/glossary/runtime";
import {
  matchGlossaryText,
  type GlossaryMatchTerm,
} from "@/core/glossary/match";
import { renderGlossaryContent } from "@/core/glossary/content";
import { surfacePortalTarget } from "@/core/themes/portal";
import { useReaderBaseUrl } from "./reader-data";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { Button } from "./ui/primitives";
import { useRouteState } from "./route-state";
import { GlossaryExpandedDialog } from "./glossary-expanded-dialog";

type MatchIndex = NonNullable<GlossaryContract["content_matches"]["data"]>;

interface ActiveTooltip {
  rect: DOMRect;
  term: GlossaryMatchTerm;
  trigger: HTMLElement;
}

const ignoredSelector = [
  "a",
  "button",
  "code",
  "pre",
  "script",
  "style",
  "svg",
  "math",
  ".katex",
  ".glossary-term",
  ".sr-only",
  "[hidden]",
  "[aria-hidden='true']",
  "[data-glossary-ignore]",
].join(",");

function decorateTextNode(
  node: Text,
  terms: readonly GlossaryMatchTerm[],
  limit: number,
) {
  if (limit <= 0 || node.parentElement?.closest(ignoredSelector)) return 0;
  const matches = matchGlossaryText(node.data, terms, limit);
  if (!matches.length) return 0;
  const fragment = document.createDocumentFragment();
  let offset = 0;
  for (const match of matches) {
    fragment.append(
      document.createTextNode(node.data.slice(offset, match.start)),
    );
    const shell = document.createElement("span");
    shell.className = "glossary-term";
    shell.dataset.glossaryTerm = match.term.id;
    shell.tabIndex = 0;
    shell.setAttribute("role", "button");
    shell.setAttribute("aria-haspopup", "dialog");
    shell.setAttribute("aria-controls", "glossary-tooltip");
    shell.setAttribute("aria-expanded", "false");
    shell.setAttribute("aria-label", `术语：${match.term.title}`);
    shell.textContent = match.text;
    fragment.append(shell);
    offset = match.end;
  }
  fragment.append(document.createTextNode(node.data.slice(offset)));
  node.replaceWith(fragment);
  return matches.length;
}

export default function GlossaryTooltips({
  root,
  contentId,
  revision,
  options,
}: {
  root: RefObject<HTMLDivElement | null>;
  contentId: string;
  revision: string;
  options: GlossaryRuntimeOptions;
}) {
  const baseUrl = useReaderBaseUrl();
  const { site } = useRouteState();
  const [index, setIndex] = useState<MatchIndex | null>(null);
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const [expanded, setExpanded] = useState(false);
  const expandedRef = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerActivation = useRef(0);
  const lastOpened = useRef(0);
  const popup = useRef<HTMLDivElement>(null);
  const terms = useMemo(
    () => new Map((index?.terms ?? []).map((term) => [term.id, term])),
    [index?.terms],
  );
  const richContent = useMemo(
    () =>
      active && expanded && options.popup_source === "content"
        ? renderGlossaryContent(active.term, site.settings?.shortcodes ?? [])
        : null,
    [active, expanded, options.popup_source, site.settings?.shortcodes],
  );

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    if (expandedRef.current) return;
    clearTimers();
    setActive((current) => {
      current?.trigger.setAttribute("aria-expanded", "false");
      return null;
    });
  }, [clearTimers]);

  const open = useCallback(
    (trigger: HTMLElement) => {
      const term = terms.get(trigger.dataset.glossaryTerm ?? "");
      if (!term) return;
      clearTimers();
      expandedRef.current = false;
      setExpanded(false);
      lastOpened.current = Date.now();
      trigger.setAttribute("aria-expanded", "true");
      setActive({ rect: trigger.getBoundingClientRect(), term, trigger });
    },
    [clearTimers, terms],
  );

  useEffect(() => {
    let active = true;
    void loadGlossaryMatches(baseUrl, contentId, revision)
      .then((value) => {
        if (active) setIndex(value);
      })
      .catch(() => {
        /* Tooltip loading never blocks the cached article. */
      });
    return () => {
      active = false;
    };
  }, [baseUrl, contentId, revision]);

  useEffect(() => {
    const target = root.current;
    if (!target || !index) return;
    let remaining = options.max_matches_per_page;
    const walker = document.createTreeWalker(target, NodeFilter.SHOW_TEXT);
    const nodes: Text[] = [];
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      if (node.data.trim()) nodes.push(node);
    }
    for (const node of nodes) {
      remaining -= decorateTextNode(node, index.terms, remaining);
      if (remaining <= 0) break;
    }
    return () => {
      for (const term of target.querySelectorAll<HTMLElement>(
        ".glossary-term[data-glossary-term]",
      )) {
        term.replaceWith(document.createTextNode(term.textContent ?? ""));
      }
    };
  }, [index, options.max_matches_per_page, root]);

  useEffect(() => {
    const target = root.current;
    if (!target || !index?.terms.length) return;
    const trigger = (event: Event) =>
      event.target instanceof Element
        ? event.target.closest<HTMLElement>(
            ".glossary-term[data-glossary-term]",
          )
        : null;
    const pointerOver = (event: PointerEvent) => {
      const item = trigger(event);
      if (
        !item ||
        event.pointerType === "touch" ||
        item === active?.trigger ||
        item.contains(event.relatedTarget as Node | null)
      )
        return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      openTimer.current = setTimeout(() => open(item), 140);
    };
    const pointerOut = (event: PointerEvent) => {
      const item = trigger(event);
      if (!item || item.contains(event.relatedTarget as Node | null)) return;
      if (Date.now() - lastPointerActivation.current < 400) return;
      if (openTimer.current) clearTimeout(openTimer.current);
      closeTimer.current = setTimeout(() => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !popup.current?.contains(event.relatedTarget)
        )
          close();
      }, 180);
    };
    const focusIn = (event: FocusEvent) => {
      const item = trigger(event);
      if (item) open(item);
    };
    const focusOut = (event: FocusEvent) => {
      const item = trigger(event);
      if (!item) return;
      closeTimer.current = setTimeout(() => {
        const next = event.relatedTarget;
        if (
          !(next instanceof Node) ||
          (!popup.current?.contains(next) && next !== item)
        )
          close();
      }, 0);
    };
    const click = (event: MouseEvent) => {
      const item = trigger(event);
      if (!item) return;
      lastPointerActivation.current = Date.now();
      event.preventDefault();
      if (active?.trigger === item && Date.now() - lastOpened.current > 300)
        close();
      else open(item);
    };
    const keydown = (event: KeyboardEvent) => {
      const item = trigger(event);
      if (!item) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(item);
      } else if (event.key === "Tab" && active?.trigger === item) {
        const link = popup.current?.querySelector<HTMLElement>("a");
        if (link) {
          event.preventDefault();
          link.focus();
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        close();
        item.focus();
      }
    };
    const outside = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return;
      if (
        !root.current?.contains(event.target) &&
        !popup.current?.contains(event.target)
      )
        close();
    };
    target.addEventListener("pointerover", pointerOver);
    target.addEventListener("pointerout", pointerOut);
    target.addEventListener("focusin", focusIn);
    target.addEventListener("focusout", focusOut);
    target.addEventListener("click", click);
    target.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside);
    return () => {
      target.removeEventListener("pointerover", pointerOver);
      target.removeEventListener("pointerout", pointerOut);
      target.removeEventListener("focusin", focusIn);
      target.removeEventListener("focusout", focusOut);
      target.removeEventListener("click", click);
      target.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", outside);
      clearTimers();
    };
  }, [active?.trigger, clearTimers, close, index?.terms.length, open, root]);

  useEffect(() => {
    if (!active) return;
    const reposition = () => {
      if (!active.trigger.isConnected) {
        close();
        return;
      }
      setActive((current) =>
        current
          ? { ...current, rect: current.trigger.getBoundingClientRect() }
          : current,
      );
    };
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [active, close]);

  if (!active || typeof window === "undefined") return null;
  const width = Math.min(380, window.innerWidth - 24);
  const left = Math.max(
    12,
    Math.min(
      active.rect.left + active.rect.width / 2 - width / 2,
      window.innerWidth - width - 12,
    ),
  );
  const above = window.innerHeight - active.rect.bottom < 260;
  const position = above
    ? { bottom: window.innerHeight - active.rect.top + 10 }
    : { top: active.rect.bottom + 10 };
  return createPortal(
    <>
      <div
        ref={popup}
        id="glossary-tooltip"
        className="glossary-tooltip"
        role="dialog"
        aria-label={`术语：${active.term.title}`}
        data-above={above}
        style={{ left, width, ...position }}
        onPointerEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
        }}
        onPointerLeave={() => {
          closeTimer.current = setTimeout(close, 180);
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            const trigger = active.trigger;
            close();
            trigger.focus();
          }
        }}
      >
        <header>
          <div className="glossary-tooltip-heading">
            <small>术语解释</small>
            <strong>{active.term.title}</strong>
            {active.term.aliases.length > 0 && (
              <small>也称：{active.term.aliases.slice(0, 3).join(" · ")}</small>
            )}
          </div>
          <Button
            type="button"
            className="icon-button glossary-tooltip-close"
            aria-label="关闭术语提示"
            onClick={close}
          >
            <Icon name="close" />
          </Button>
        </header>
        <p>{active.term.summary}</p>
        <div className="glossary-tooltip-actions">
          <AppLink href={active.term.path}>查看词条</AppLink>
          {options.popup_source === "content" &&
            active.term.body.some((block) => block.content.trim()) && (
              <Button
                className="glossary-tooltip-expand"
                onClick={() => {
                  clearTimers();
                  expandedRef.current = true;
                  setExpanded(true);
                }}
              >
                完整说明 <Icon name="external" />
              </Button>
            )}
        </div>
      </div>
      {expanded && richContent && (
        <GlossaryExpandedDialog
          title={active.term.title}
          path={active.term.path}
          html={richContent.html}
          features={richContent.features}
          onDismiss={() => {
            const trigger = active.trigger;
            expandedRef.current = false;
            setExpanded(false);
            close();
            queueMicrotask(() => {
              if (trigger.isConnected) trigger.focus({ preventScroll: true });
            });
          }}
        />
      )}
    </>,
    surfacePortalTarget(),
  );
}
