"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
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
import {
  renderGlossaryContent,
  renderGlossaryPreview,
} from "@/core/glossary/content";
import { surfacePortalTarget } from "@/core/themes/portal";
import { afterDialogMotion } from "../hooks/dialog-motion";
import { useReaderBaseUrl } from "./reader-data";
import { AppLink } from "./navigation-link";
import { Icon } from "./icon";
import { Button } from "./ui/primitives";
import { useRouteState } from "./route-state";
import { ContentMarkupView } from "./content-markup-view";
import { GlossaryExpandedDialog } from "./glossary-expanded-dialog";

type MatchIndex = NonNullable<GlossaryContract["content_matches"]["data"]>;

interface ActiveTooltip {
  rect: DOMRect;
  term: GlossaryMatchTerm;
  trigger: HTMLElement;
}

interface TooltipPlacement {
  above: boolean;
  maxHeight: number;
  top: number;
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
  const [closing, setClosing] = useState(false);
  const [placement, setPlacement] = useState<TooltipPlacement | null>(null);
  const expandedRef = useRef(false);
  const closingRef = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPointerActivation = useRef(0);
  const lastOpened = useRef(0);
  const popup = useRef<HTMLDivElement>(null);
  const terms = useMemo(
    () => new Map((index?.terms ?? []).map((term) => [term.id, term])),
    [index?.terms],
  );
  const fullContent = useMemo(
    () =>
      active && active.term.body.some((block) => block.content.trim())
        ? renderGlossaryContent(active.term, site.settings?.shortcodes ?? [])
        : null,
    [active, site.settings?.shortcodes],
  );
  const previewContent = useMemo(
    () =>
      active && !active.term.summary.trim()
        ? renderGlossaryPreview(active.term, site.settings?.shortcodes ?? [])
        : null,
    [active, site.settings?.shortcodes],
  );
  const visibleAliases = active?.term.aliases.slice(0, 4) ?? [];
  const remainingAliases =
    active?.term.aliases.slice(visibleAliases.length) ?? [];

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    if (expandedRef.current || closingRef.current) return;
    clearTimers();
    closingRef.current = true;
    setClosing(true);
  }, [clearTimers]);

  const open = useCallback(
    (trigger: HTMLElement) => {
      const term = terms.get(trigger.dataset.glossaryTerm ?? "");
      if (!term) return;
      clearTimers();
      expandedRef.current = false;
      closingRef.current = false;
      setExpanded(false);
      setClosing(false);
      setPlacement(null);
      lastOpened.current = Date.now();
      trigger.setAttribute("aria-expanded", "true");
      setActive({ rect: trigger.getBoundingClientRect(), term, trigger });
    },
    [clearTimers, terms],
  );

  useEffect(() => {
    if (!closing) return;
    return afterDialogMotion(popup.current, () => {
      setActive((current) => {
        current?.trigger.setAttribute("aria-expanded", "false");
        return null;
      });
      closingRef.current = false;
      setClosing(false);
    });
  }, [closing]);

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
      openTimer.current = setTimeout(() => open(item), 260);
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

  useLayoutEffect(() => {
    const element = popup.current;
    if (!active || !element) return;
    const boundary = 12;
    const gap = 10;
    const maxViewportHeight = Math.max(80, window.innerHeight - boundary * 2);
    const desiredHeight = Math.min(360, element.scrollHeight);
    const belowTop = active.rect.bottom + gap;
    const belowSpace = window.innerHeight - boundary - belowTop;
    const aboveSpace = active.rect.top - gap - boundary;
    const above = belowSpace < desiredHeight && aboveSpace > belowSpace;
    const available = Math.max(80, above ? aboveSpace : belowSpace);
    const maxHeight = Math.min(360, maxViewportHeight, available);
    const renderedHeight = Math.min(desiredHeight, maxHeight);
    const preferredTop = above
      ? active.rect.top - gap - renderedHeight
      : belowTop;
    const top = Math.max(
      boundary,
      Math.min(preferredTop, window.innerHeight - boundary - renderedHeight),
    );
    setPlacement((current) =>
      current &&
      current.above === above &&
      Math.abs(current.maxHeight - maxHeight) < 0.5 &&
      Math.abs(current.top - top) < 0.5
        ? current
        : { above, maxHeight, top },
    );
  }, [active]);

  if (!active || typeof window === "undefined") return null;
  const width = Math.min(400, window.innerWidth - 24);
  const left = Math.max(
    12,
    Math.min(
      active.rect.left + active.rect.width / 2 - width / 2,
      window.innerWidth - width - 12,
    ),
  );
  const arrowLeft = Math.max(
    14,
    Math.min(width - 14, active.rect.left + active.rect.width / 2 - left),
  );
  const style = {
    left,
    width,
    top: placement?.top ?? Math.max(12, active.rect.bottom + 10),
    maxHeight: placement?.maxHeight ?? 360,
    visibility: placement ? "visible" : "hidden",
    "--glossary-arrow-left": `${arrowLeft}px`,
  } as CSSProperties;
  return createPortal(
    <>
      <div
        ref={popup}
        id="glossary-tooltip"
        className="glossary-tooltip"
        role="dialog"
        aria-label={`术语：${active.term.title}`}
        data-above={placement?.above ?? false}
        data-state={closing ? "closing" : "open"}
        style={style}
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
            <span className="glossary-tooltip-kicker">术语</span>
            <strong title={active.term.title}>{active.term.title}</strong>
          </div>
          <Button
            type="button"
            className="icon-button glossary-tooltip-close"
            aria-label="关闭术语提示"
            disabled={closing}
            onClick={close}
          >
            <Icon name="close" />
          </Button>
        </header>
        <div className="glossary-tooltip-body">
          <div className="glossary-tooltip-scroll">
            {active.term.aliases.length > 0 && (
              <div
                className="glossary-tooltip-aliases"
                role="list"
                aria-label="术语别名"
              >
                <span>也称</span>
                {visibleAliases.map((alias) => (
                  <span key={alias} role="listitem" title={alias}>
                    {alias}
                  </span>
                ))}
                {remainingAliases.length > 0 && (
                  <span
                    className="glossary-tooltip-alias-more"
                    role="listitem"
                    title={remainingAliases.join(" · ")}
                  >
                    +{remainingAliases.length}
                  </span>
                )}
              </div>
            )}
            {active.term.summary.trim() ? (
              <p className="glossary-tooltip-summary">{active.term.summary}</p>
            ) : previewContent ? (
              <ContentMarkupView
                className="article-content glossary-tooltip-content"
                data-glossary-ignore
                html={previewContent.html}
                features={previewContent.features}
                codeTools={false}
              />
            ) : null}
          </div>
          <div className="glossary-tooltip-actions">
            <AppLink
              href={active.term.path}
              target="_blank"
              rel="noopener noreferrer"
            >
              打开词条页面 <Icon name="external" />
            </AppLink>
            {fullContent && (
              <Button
                className="glossary-tooltip-expand"
                aria-haspopup="dialog"
                onClick={() => {
                  clearTimers();
                  expandedRef.current = true;
                  setExpanded(true);
                }}
              >
                <Icon name="book" />
                查看详情
              </Button>
            )}
          </div>
        </div>
      </div>
      {expanded && fullContent && (
        <GlossaryExpandedDialog
          title={active.term.title}
          path={active.term.path}
          html={fullContent.html}
          features={fullContent.features}
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
