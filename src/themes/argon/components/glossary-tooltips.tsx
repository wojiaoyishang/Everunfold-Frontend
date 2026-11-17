"use client";
import { glossaryTermPath } from "@/core/glossary/routes";

import {
  useCallback,
  useContext,
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
  loadGlossaryTerm,
  type GlossaryRuntimeOptions,
} from "@/core/glossary/runtime";
import type { GlossaryMatchTerm } from "@/core/glossary/match";
import { observeGlossaryMarkup } from "@/core/glossary/decorate";
import { useOptionalAdminRequest } from "@/core/admin/account-context";
import type { GlossaryPopup } from "@/core/shortcodes/glossary";
import {
  siteShortcodes,
  type RenderShortcodes,
} from "@/core/shortcodes/configuration";
import { inspectContentFeatures } from "@/core/rendering/features/content-features";
import {
  renderGlossaryContent,
  renderGlossaryPreview,
} from "@/core/glossary/content";
import { surfacePortalTarget } from "@/core/themes/portal";
import { afterDialogMotion } from "../hooks/dialog-motion";
import { useOptionalReaderBaseUrl } from "./reader-data";
import { Icon } from "./icon";
import { Button, Popover, TextLink } from "./ui/primitives";
import { useOptionalRouteState } from "./route-state";
import { ContentMarkupView } from "./content-markup-view";
import { ArticleMedia } from "./article-media";
import { GlossaryExpandedDialog } from "./glossary-expanded-dialog";
import {
  GlossaryPopupScope,
  type GlossaryPopups,
} from "./glossary-popup-scope";
import { LoadingProgress } from "./extension-placeholder";
import { useLanguageCatalog, useLocale, useT } from "@/core/i18n/provider";
import { translate } from "@/core/i18n/messages";
import Image from "next/image";

type MatchIndex = NonNullable<GlossaryContract["content_matches"]["data"]>;

interface ActiveTooltip {
  rect: DOMRect;
  term?: PopoverTerm;
  authored?: Exclude<GlossaryPopup, { kind: "term" }>;
  status?: "loading" | "unavailable";
  title: string;
  trigger: HTMLElement;
}

interface TooltipPlacement {
  above: boolean;
  maxHeight: number;
  top: number;
}

type PopoverTerm = Omit<
  GlossaryMatchTerm,
  "matched_patterns" | "matched_texts"
>;
const interactiveContent =
  "a[href],button,input,select,textarea,summary,video[controls],audio[controls],[contenteditable='true']";

export default function GlossaryTooltips({
  root,
  contentId,
  revision,
  options,
  matchIndex,
  markupSelector,
  terms: providedTerms,
  triggerSelector = ".glossary-term[data-glossary-term]",
  preserveNativeClick = false,
  popupId = "glossary-tooltip",
  authoredPopups,
  shortcodes,
}: {
  root: RefObject<HTMLElement | null>;
  contentId?: string;
  revision?: string;
  options?: GlossaryRuntimeOptions;
  matchIndex?: MatchIndex;
  markupSelector?: string;
  terms?: readonly PopoverTerm[];
  triggerSelector?: string;
  preserveNativeClick?: boolean;
  popupId?: string;
  authoredPopups?: GlossaryPopups;
  shortcodes?: RenderShortcodes;
}) {
  const readerBase = useOptionalReaderBaseUrl();
  const adminBase = useOptionalAdminRequest()?.baseUrl;
  const baseUrl = readerBase ?? adminBase;
  const site = useOptionalRouteState()?.site;
  const { locale, uiLocale } = useLocale();
  const language = site?.locale ?? locale;
  const catalog = useLanguageCatalog();
  const t = useT();
  const fallbackTitle = t("术语");
  const [publicIndex, setPublicIndex] = useState<MatchIndex | null>(null);
  const index = matchIndex ?? publicIndex;
  const [active, setActive] = useState<ActiveTooltip | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [closing, setClosing] = useState(false);
  const [entered, setEntered] = useState(false);
  const [placement, setPlacement] = useState<TooltipPlacement | null>(null);
  const expandedRef = useRef(false);
  const closingRef = useRef(false);
  const openTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const imageViewerOpen = useRef(false);
  const lastPointerActivation = useRef(0);
  const lastOpened = useRef(0);
  const popup = useRef<HTMLDivElement>(null);
  const request = useRef(0);
  const skipFocus = useRef(false);
  const parentLayer = useContext(GlossaryPopupScope);
  const childPopups = useMemo(() => new Set<HTMLElement>(), []);
  const terms = useMemo(() => {
    const source: readonly PopoverTerm[] = providedTerms ?? index?.terms ?? [];
    return new Map(source.map((term) => [term.id, term]));
  }, [index?.terms, providedTerms]);
  const term = active?.term;
  const configuration = useMemo(
    () => shortcodes ?? siteShortcodes(site?.settings),
    [shortcodes, site?.settings],
  );
  const fullContent = useMemo(
    () =>
      term?.body.some((block) => block.content.trim())
        ? renderGlossaryContent(term, configuration)
        : null,
    [configuration, term],
  );
  const previewContent = useMemo(
    () =>
      term && !term.summary.trim()
        ? renderGlossaryPreview(term, configuration)
        : null,
    [configuration, term],
  );
  const authoredMarkup =
    active?.authored?.kind === "markup" ? active.authored.html : null;
  const authoredFeatures = useMemo(
    () => (authoredMarkup ? inspectContentFeatures(authoredMarkup) : null),
    [authoredMarkup],
  );
  const visibleAliases = term?.aliases.slice(0, 4) ?? [];
  const remainingAliases = term?.aliases.slice(visibleAliases.length) ?? [];
  const termPath = term && (glossaryTermPath(term, catalog) ?? term.path);
  const layer = useMemo(
    () => ({
      ancestors: [...parentLayer.ancestors, childPopups],
      terms: term ? [...parentLayer.terms, term.id] : parentLayer.terms,
      popups: authoredPopups,
    }),
    [authoredPopups, childPopups, parentLayer, term],
  );

  const activeTrigger = active?.trigger;
  useLayoutEffect(() => {
    const element = popup.current;
    if (!element || !activeTrigger) return;
    for (const layer of parentLayer.ancestors) layer.add(element);
    return () => {
      for (const layer of parentLayer.ancestors) layer.delete(element);
    };
  }, [activeTrigger, parentLayer.ancestors]);

  const containsPopup = useCallback(
    (node: EventTarget | null) =>
      node instanceof Node &&
      (popup.current?.contains(node) ||
        [...childPopups].some((child) => child.contains(node))),
    [childPopups],
  );

  const focusTrigger = useCallback((trigger: HTMLElement) => {
    if (!trigger.isConnected) return;
    skipFocus.current = true;
    trigger.focus({ preventScroll: true });
    skipFocus.current = false;
  }, []);

  const clearTimers = useCallback(() => {
    if (openTimer.current) clearTimeout(openTimer.current);
    if (closeTimer.current) clearTimeout(closeTimer.current);
    openTimer.current = null;
    closeTimer.current = null;
  }, []);

  const close = useCallback(() => {
    if (expandedRef.current || closingRef.current || !popup.current) return;
    clearTimers();
    request.current++;
    closingRef.current = true;
    setClosing(true);
  }, [clearTimers]);
  const onImageViewerChange = useCallback(
    (open: boolean) => {
      imageViewerOpen.current = open;
      if (open && closeTimer.current) {
        clearTimeout(closeTimer.current);
        closeTimer.current = null;
      } else if (!open) {
        closeTimer.current = setTimeout(close, 180);
      }
    },
    [close],
  );

  const open = useCallback(
    (trigger: HTMLElement) => {
      const term = terms.get(trigger.dataset.glossaryTerm ?? "");
      const id = trigger.dataset.glossaryPopup ?? "";
      const authored =
        authoredPopups && Object.hasOwn(authoredPopups, id)
          ? authoredPopups[id]
          : undefined;
      if (!term && !authored) return;
      const ticket = ++request.current;
      clearTimers();
      expandedRef.current = false;
      closingRef.current = false;
      setExpanded(false);
      setClosing(false);
      setEntered(false);
      setPlacement(null);
      lastOpened.current = Date.now();
      const title =
        term?.title ||
        (authored?.kind !== "term" && authored?.title) ||
        (trigger.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 120) ||
        fallbackTitle;
      const current: ActiveTooltip = {
        rect: trigger.getBoundingClientRect(),
        term,
        trigger,
        title,
        authored: authored?.kind === "term" ? undefined : authored,
        status:
          authored?.kind === "term"
            ? baseUrl
              ? "loading"
              : "unavailable"
            : undefined,
      };
      setActive((previous) => {
        if (previous?.trigger !== trigger)
          previous?.trigger.setAttribute("aria-expanded", "false");
        trigger.setAttribute("aria-expanded", "true");
        return current;
      });
      if (authored?.kind !== "term" || !baseUrl) return;
      void loadGlossaryTerm(baseUrl, authored.slug, language)
        .then((term) => {
          if (request.current !== ticket || !trigger.isConnected) return;
          if (parentLayer.terms.includes(term.id)) {
            trigger.removeAttribute("data-glossary-interactive");
            trigger.removeAttribute("tabindex");
            trigger.removeAttribute("role");
            trigger.removeAttribute("aria-controls");
            trigger.removeAttribute("aria-haspopup");
            close();
          } else {
            setActive(
              (previous) =>
                previous && {
                  ...previous,
                  title: term.title,
                  term,
                  status: undefined,
                },
            );
          }
        })
        .catch(() => {
          if (request.current === ticket)
            setActive(
              (previous) => previous && { ...previous, status: "unavailable" },
            );
        });
    },
    [
      authoredPopups,
      baseUrl,
      clearTimers,
      close,
      fallbackTitle,
      language,
      parentLayer.terms,
      terms,
    ],
  );

  useEffect(
    () => () => {
      request.current++;
    },
    [],
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
      setEntered(false);
    });
  }, [closing]);

  useEffect(() => {
    if (!active || !placement || closing) return;
    let second = 0;
    const first = requestAnimationFrame(() => {
      second = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(first);
      if (second) cancelAnimationFrame(second);
    };
  }, [active, closing, placement]);

  useEffect(() => {
    if (matchIndex || providedTerms || !contentId || !revision || !baseUrl)
      return;
    let active = true;
    void loadGlossaryMatches(baseUrl, contentId, revision)
      .then((value) => {
        if (active) setPublicIndex(value);
      })
      .catch(() => {
        /* Tooltip loading never blocks the cached article. */
      });
    return () => {
      active = false;
    };
  }, [baseUrl, contentId, matchIndex, providedTerms, revision]);

  useEffect(() => {
    const target = root.current;
    if (!target || !index || providedTerms || !options) return;
    return observeGlossaryMarkup(target, index.terms, {
      maxMatches: options.max_matches_per_page,
      markupSelector,
      label: (title) => translate("术语：{title}", uiLocale, { title }),
    });
  }, [index, markupSelector, options, providedTerms, root, uiLocale]);

  useEffect(() => {
    const target = root.current;
    if (
      !target ||
      (!authoredPopups && !index?.terms.length && !providedTerms?.length)
    )
      return;
    const trigger = (element: EventTarget | null) => {
      const item =
        element instanceof Element
          ? element.closest<HTMLElement>(triggerSelector)
          : null;
      return item && target.contains(item) ? item : null;
    };
    const hoverEnded = (next: EventTarget | null) => {
      if (!childPopups.size && !containsPopup(next)) close();
    };
    const pointerOver = (event: PointerEvent) => {
      const item = trigger(event.target);
      if (
        !item ||
        event.pointerType === "touch" ||
        trigger(event.relatedTarget) === item
      )
        return;
      if (closeTimer.current) clearTimeout(closeTimer.current);
      if (openTimer.current) clearTimeout(openTimer.current);
      if (item === activeTrigger) return;
      openTimer.current = setTimeout(() => open(item), 180);
    };
    const pointerOut = (event: PointerEvent) => {
      const item = trigger(event.target);
      if (!item || trigger(event.relatedTarget) === item) return;
      if (Date.now() - lastPointerActivation.current < 400) return;
      if (openTimer.current) clearTimeout(openTimer.current);
      closeTimer.current = setTimeout(
        () => hoverEnded(event.relatedTarget),
        180,
      );
    };
    const focusIn = (event: FocusEvent) => {
      if (skipFocus.current || authoredPopups) return;
      const item = trigger(event.target);
      if (item) open(item);
    };
    const focusOut = (event: FocusEvent) => {
      const item = trigger(event.target);
      if (!item || item !== activeTrigger) return;
      closeTimer.current = setTimeout(() => {
        if (event.relatedTarget !== item) hoverEnded(event.relatedTarget);
      }, 0);
    };
    const nativeControl = (event: Event) =>
      authoredPopups &&
      event.target instanceof Element &&
      event.target.closest(interactiveContent);
    const click = (event: MouseEvent) => {
      const item = trigger(event.target);
      if (!item || nativeControl(event)) return;
      if (
        preserveNativeClick &&
        item.matches(
          "a[href],button,input,select,textarea,summary,[role='button'],[role='link'],[contenteditable='true']",
        )
      )
        return;
      lastPointerActivation.current = Date.now();
      event.preventDefault();
      if (activeTrigger === item && Date.now() - lastOpened.current > 300)
        close();
      else open(item);
    };
    const keydown = (event: KeyboardEvent) => {
      const item = trigger(event.target);
      if (!item || nativeControl(event)) return;
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        open(item);
      } else if (
        event.key === "Tab" &&
        !event.shiftKey &&
        activeTrigger === item
      ) {
        const control =
          popup.current?.querySelector<HTMLElement>(
            ".glossary-tooltip-body a[href], .glossary-tooltip-body [data-glossary-interactive]",
          ) ??
          popup.current?.querySelector<HTMLElement>(".glossary-tooltip-close");
        if (control) {
          event.preventDefault();
          control.focus();
        }
      } else if (
        !authoredPopups &&
        event.key === "Escape" &&
        !childPopups.size
      ) {
        event.preventDefault();
        close();
        focusTrigger(item);
      }
    };
    const outside = (event: PointerEvent) => {
      if (
        !activeTrigger ||
        !(event.target instanceof Node) ||
        containsPopup(event.target)
      )
        return;
      if (!(authoredPopups ? activeTrigger : target).contains(event.target))
        close();
    };
    const escape = (event: KeyboardEvent) => {
      if (
        !authoredPopups ||
        !activeTrigger ||
        event.key !== "Escape" ||
        event.defaultPrevented ||
        closingRef.current ||
        expandedRef.current ||
        imageViewerOpen.current ||
        childPopups.size ||
        !activeTrigger.isConnected
      )
        return;
      event.preventDefault();
      event.stopPropagation();
      close();
      focusTrigger(activeTrigger);
    };
    target.addEventListener("pointerover", pointerOver);
    target.addEventListener("pointerout", pointerOut);
    target.addEventListener("focusin", focusIn);
    target.addEventListener("focusout", focusOut);
    target.addEventListener("click", click);
    target.addEventListener("keydown", keydown);
    document.addEventListener("pointerdown", outside);
    if (authoredPopups) document.addEventListener("keydown", escape, true);
    return () => {
      target.removeEventListener("pointerover", pointerOver);
      target.removeEventListener("pointerout", pointerOut);
      target.removeEventListener("focusin", focusIn);
      target.removeEventListener("focusout", focusOut);
      target.removeEventListener("click", click);
      target.removeEventListener("keydown", keydown);
      document.removeEventListener("pointerdown", outside);
      if (authoredPopups) document.removeEventListener("keydown", escape, true);
      clearTimers();
    };
  }, [
    activeTrigger,
    authoredPopups,
    childPopups,
    clearTimers,
    close,
    containsPopup,
    focusTrigger,
    index?.terms.length,
    open,
    preserveNativeClick,
    providedTerms,
    root,
    triggerSelector,
  ]);

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
    if (element.hasAttribute("popover") && !element.matches(":popover-open"))
      element.showPopover();
    const boundary = 12;
    const gap = 10;
    const maxViewportHeight = Math.max(80, window.innerHeight - boundary * 2);
    const scroll = element.querySelector(".glossary-tooltip-scroll");
    const overflow = scroll
      ? Math.max(0, scroll.scrollHeight - scroll.clientHeight)
      : 0;
    const desiredHeight = Math.min(360, element.offsetHeight + overflow);
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
  const dialog = active.trigger.closest("dialog[open]");
  const Panel = dialog ? Popover : "div";
  const viewport = document.documentElement.clientWidth;
  const width = Math.min(400, viewport - 24);
  const left = Math.max(
    12,
    Math.min(
      active.rect.left + active.rect.width / 2 - width / 2,
      viewport - width - 12,
    ),
  );
  const arrowLeft = Math.max(
    14,
    Math.min(width - 18, active.rect.left + active.rect.width / 2 - left - 2),
  );
  const style = {
    left,
    width,
    top: placement?.top ?? Math.max(12, active.rect.bottom + 10),
    maxHeight: placement?.maxHeight ?? 360,
    visibility: placement ? "visible" : "hidden",
    zIndex: 80 + parentLayer.ancestors.length,
    "--glossary-arrow-left": `${arrowLeft}px`,
  } as CSSProperties;
  return createPortal(
    <GlossaryPopupScope.Provider value={layer}>
      <Panel
        ref={popup}
        id={popupId}
        className="glossary-tooltip"
        role="dialog"
        popover={dialog ? "manual" : undefined}
        aria-label={t("术语：{title}", { title: active.title })}
        data-above={placement?.above ?? false}
        data-entered={entered}
        data-state={closing ? "closing" : "open"}
        style={style}
        onPointerEnter={() => {
          if (closeTimer.current) clearTimeout(closeTimer.current);
        }}
        onPointerLeave={(event) => {
          if (
            imageViewerOpen.current ||
            childPopups.size ||
            containsPopup(event.relatedTarget)
          )
            return;
          closeTimer.current = setTimeout(() => {
            if (!childPopups.size) close();
          }, 180);
        }}
        onKeyDown={(event) => {
          if (
            event.key === "Escape" &&
            !childPopups.size &&
            !expandedRef.current &&
            !imageViewerOpen.current
          ) {
            event.preventDefault();
            event.stopPropagation();
            close();
            focusTrigger(active.trigger);
          }
        }}
      >
        <header>
          <div className="glossary-tooltip-heading">
            {term && (
              <span className="glossary-tooltip-kicker">{fallbackTitle}</span>
            )}
            <strong title={active.title}>{active.title}</strong>
          </div>
          <Button
            type="button"
            className="icon-button glossary-tooltip-close"
            aria-label={t("关闭术语提示")}
            disabled={closing}
            onClick={() => {
              close();
              focusTrigger(active.trigger);
            }}
          >
            <Icon name="close" />
          </Button>
        </header>
        <div className="glossary-tooltip-body" data-actions={Boolean(termPath)}>
          <div className="glossary-tooltip-scroll">
            <ArticleMedia
              enabled={term?.show_image_viewer !== false}
              selector="[data-reader-image] img[src], .glossary-tooltip-content img[src]"
              className="glossary-tooltip-viewer"
              onOpenChange={onImageViewerChange}
            >
              {term?.feature_image && (
                <span className="glossary-tooltip-feature" data-reader-image>
                  <Image
                    src={term.feature_image.original}
                    alt=""
                    fill
                    sizes="400px"
                    unoptimized
                  />
                </span>
              )}
              {visibleAliases.length > 0 && (
                <div
                  className="glossary-tooltip-aliases"
                  role="list"
                  aria-label={t("术语别名")}
                >
                  <span>{t("也称")}</span>
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
              {term?.summary.trim() ? (
                <p className="glossary-tooltip-summary">{term.summary}</p>
              ) : previewContent ? (
                <ContentMarkupView
                  className="article-content glossary-tooltip-content"
                  data-glossary-ignore
                  html={previewContent.html}
                  features={previewContent.features}
                  shortcodes={configuration}
                  codeTools={false}
                />
              ) : null}
              {active.authored?.kind === "text" && (
                <p className="glossary-tooltip-summary">
                  {active.authored.text}
                </p>
              )}
              {authoredMarkup !== null && authoredFeatures && (
                <ContentMarkupView
                  className="article-content glossary-tooltip-content"
                  data-glossary-ignore
                  html={authoredMarkup}
                  features={authoredFeatures}
                  shortcodes={configuration}
                  codeTools={false}
                />
              )}
              {active.status === "loading" && (
                <LoadingProgress label="正在读取术语…" />
              )}
              {active.status === "unavailable" && (
                <p className="glossary-tooltip-summary" role="status">
                  {t("词条暂不可用。")}
                </p>
              )}
            </ArticleMedia>
          </div>
          {termPath && (
            <div className="glossary-tooltip-actions">
              <TextLink
                href={termPath}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("打开词条页面")} <Icon name="external" />
              </TextLink>
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
                  {t("查看详情")}
                </Button>
              )}
            </div>
          )}
        </div>
      </Panel>
      {expanded && fullContent && termPath && (
        <GlossaryExpandedDialog
          title={active.title}
          path={termPath}
          html={fullContent.html}
          features={fullContent.features}
          shortcodes={configuration}
          onDismiss={() => {
            const trigger = active.trigger;
            expandedRef.current = false;
            setExpanded(false);
            close();
            queueMicrotask(() => focusTrigger(trigger));
          }}
        />
      )}
    </GlossaryPopupScope.Provider>,
    dialog ?? surfacePortalTarget(),
  );
}
