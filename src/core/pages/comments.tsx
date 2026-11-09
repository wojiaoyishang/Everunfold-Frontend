"use client";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import type { PublicManagedPage } from "@/core/contracts/pages";
import type { PublicComment } from "@/core/content/types";
import { ExtensionComponent } from "@/core/extensions/components";
import { usePluginRuntime } from "@/core/plugins/runtime/context";
import { pluginRegistry } from "@/core/plugins/registry";
import { useReaderData } from "@/themes/argon/components/reader-data";
import {
  placePageCommentsHost,
  showPageCommentsFallback,
} from "./comment-placement";

export interface PageCommentsContextValue {
  page: PublicManagedPage;
  pageId: string;
  path: string;
  comments: PublicComment[];
  /** Whether the author permits new comments; preview is a separate guard. */
  open: boolean;
  preview: boolean;
  /** Memory-only reading grant; never persist it or place it in a URL. */
  readReceipt?: string;
  baseUrl: string;
}

const PageCommentsContext = createContext<PageCommentsContextValue | null>(
  null,
);

/** Use with useCaptcha, CaptchaField, readPageComments and submitReaderComment. */
export function usePageComments() {
  const context = useContext(PageCommentsContext);
  if (!context) throw new Error("Page comments require a managed page context");
  return context;
}

/** One anchor selects the host's shared section, preserving one set of IDs. */
export function PageComments({ className }: { className?: string }) {
  usePageComments();
  return <div className={className} data-page-comments-slot="true" />;
}

export function PageCommentsBoundary({
  page,
  comments,
  preview = false,
  readReceipt,
  children,
}: {
  page: PublicManagedPage;
  comments: PublicComment[];
  preview?: boolean;
  readReceipt?: string;
  children: ReactNode;
}) {
  const { store } = useReaderData();
  const runtime = usePluginRuntime();
  const definitions =
    runtime.catalog?.plugins
      .filter((plugin) => !runtime.catalog?.disabled.includes(plugin.id))
      .flatMap((plugin) => plugin.pages) ?? pluginRegistry.pages;
  const options =
    page.source === "registered"
      ? definitions.find(
          ({ registration }) =>
            registration.id === page.implementation_id &&
            registration.version === page.implementation_version,
        )?.comments
      : undefined;
  const placement = options?.placement;
  const selector = options?.selector;
  const scope = useRef<HTMLDivElement>(null);
  const fallback = useRef<HTMLDivElement>(null);
  const [host, setHost] = useState<HTMLDivElement | null>(null);
  const [activated, setActivated] = useState(showPageCommentsFallback(options));
  const open = page.comments_open ?? true;
  const context = useMemo(
    () => ({
      page,
      pageId: page.id,
      path: page.path,
      comments,
      open,
      preview,
      readReceipt,
      baseUrl: store.baseUrl,
    }),
    [page, comments, open, preview, readReceipt, store.baseUrl],
  );
  useEffect(() => {
    const container = document.createElement("div");
    container.dataset.pageCommentsHost = "true";
    let disposed = false;
    queueMicrotask(() => {
      if (!disposed) setHost(container);
    });
    return () => {
      disposed = true;
      container.remove();
    };
  }, []);
  useEffect(() => {
    const root = scope.current;
    const home = fallback.current;
    const section = host;
    if (!root || !home || !section) return;
    const placementOptions = placement ? { placement, selector } : undefined;
    let disposed = false;
    const place = () => {
      if (disposed) return;
      // Reparent the stable host, rather than remounting its composer or CAPTCHA.
      if (placePageCommentsHost(root, home, section, placementOptions))
        setActivated(true);
    };
    queueMicrotask(place);
    const observer = new MutationObserver(place);
    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
    });
    return () => {
      disposed = true;
      observer.disconnect();
    };
  }, [host, placement, selector]);
  return (
    <PageCommentsContext.Provider value={context}>
      <div ref={scope} style={{ display: "contents" }}>
        {children}
        <div ref={fallback} style={{ display: "contents" }} />
        {host &&
          activated &&
          (open || comments.length > 0) &&
          createPortal(
            <ExtensionComponent name="public.page.comments" />,
            host,
          )}
      </div>
    </PageCommentsContext.Provider>
  );
}
