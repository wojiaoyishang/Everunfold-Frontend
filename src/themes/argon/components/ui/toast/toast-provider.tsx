"use client";
import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { isEmbeddedEditor } from "@/core/preview/bridge";
import { ToastStore, type ToastEntry } from "./store";
import { afterDialogMotion } from "../../../hooks/dialog-motion";
import { Button } from "../primitives";
import { Icon } from "../../icon";
import styles from "./toast.module.css";
const ToastContext = createContext<ToastStore | null>(null);
export function useToast() {
  const store = useContext(ToastContext);
  if (!store) throw new Error("ToastProvider is required");
  return store;
}
export function ToastProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new ToastStore());
  return (
    <ToastContext.Provider value={store}>
      {children}
      <ToastViewport store={store} />
    </ToastContext.Provider>
  );
}
function ToastViewport({ store }: { store: ToastStore }) {
  const entries = useSyncExternalStore(
    store.subscribe,
    store.snapshot,
    store.snapshot,
  );
  const [, refresh] = useReducer((value: number) => value + 1, 0);
  const active = entries.length > 0;
  useEffect(() => {
    if (!active) return;
    // Confirmation results can arrive before the native dialog exits.
    document.addEventListener("close", refresh, true);
    return () => document.removeEventListener("close", refresh, true);
  }, [active]);
  if (!entries.length || typeof document === "undefined") return null;
  const surface =
    document.querySelector(
      "[data-surface='admin'], [data-public-theme], .blog-shell, .auth-root",
    ) ?? document.body;
  let liveSurface: Element | null = null;
  if (isEmbeddedEditor()) {
    try {
      liveSurface = window.parent.document.querySelector(
        "[data-live-workspace]",
      );
    } catch {
      /* An unrelated parent cannot host private feedback. */
    }
  }
  const dialog = Array.from(document.querySelectorAll("dialog[open]")).at(-1);
  return ([undefined, "top-center"] as const).map((placement) => {
    const placed = entries.filter((entry) => entry.placement === placement);
    if (!placed.length) return null;
    const target =
      placement === "top-center"
        ? (liveSurface ?? surface)
        : (dialog ?? surface);
    return createPortal(
      <ToastLane
        placement={placement}
        entries={placed}
        store={store}
        target={target}
      />,
      target,
      placement ?? "default",
    );
  });
}

function ToastLane({
  placement,
  entries,
  store,
  target,
}: {
  placement: ToastEntry["placement"];
  entries: ToastEntry[];
  store: ToastStore;
  target: Element;
}) {
  const lane = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (placement !== "top-center" || !target.matches("[data-surface='admin']"))
      return;
    const header = target.querySelector(".admin-header, [data-live-toolbar]");
    const toolbar = target.querySelector(".admin-page-editor-toolbar");
    const dock = header?.querySelector("[data-admin-header-dock]");
    const update = () => {
      const bottom = Math.max(
        header?.getBoundingClientRect().bottom ?? 0,
        dock?.getBoundingClientRect().bottom ?? 0,
        toolbar?.getBoundingClientRect().bottom ?? 0,
      );
      lane.current?.style.setProperty("--toast-top", `${bottom + 8}px`);
    };
    const observer = new ResizeObserver(update);
    for (const element of [header, dock, toolbar])
      if (element) observer.observe(element);
    window.addEventListener("scroll", update, true);
    update();
    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", update, true);
    };
  }, [placement, target]);
  return (
    <section
      ref={lane}
      className={styles.viewport}
      data-placement={placement}
      aria-label="通知"
      tabIndex={-1}
    >
      {entries.map((entry) => (
        <Toast key={entry.id} entry={entry} store={store} />
      ))}
    </section>
  );
}

function Toast({ entry, store }: { entry: ToastEntry; store: ToastStore }) {
  const element = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false),
    [focused, setFocused] = useState(false);
  const tone = entry.tone ?? "info";
  const duration =
    entry.duration ?? (tone === "loading" || tone === "error" ? 0 : 4000);
  const remaining = useRef(duration);
  useEffect(() => {
    remaining.current = duration;
  }, [duration, tone, entry.version]);
  useEffect(() => {
    if (!duration || entry.closing || hovered || focused) return;
    const started = performance.now();
    const timer = setTimeout(() => store.dismiss(entry.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (performance.now() - started),
      );
    };
  }, [
    duration,
    entry.id,
    entry.version,
    entry.closing,
    hovered,
    focused,
    store,
    tone,
  ]);
  useEffect(() => {
    if (entry.closing)
      return afterDialogMotion(
        element.current,
        () => store.remove(entry.id),
        300,
      );
  }, [entry.closing, entry.id, store]);
  return (
    <div
      className={styles.toast}
      data-tone={tone}
      data-state={entry.closing ? "closing" : "open"}
      ref={element}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setFocused(false);
      }}
    >
      <span className={styles.mark} aria-hidden="true">
        {tone === "loading" ? (
          <span className={styles.spinner} />
        ) : (
          <Icon
            name={
              tone === "success" ? "check" : tone === "error" ? "close" : "bell"
            }
          />
        )}
      </span>
      <div className={styles.content}>
        <div role={tone === "error" ? "alert" : "status"} aria-atomic="true">
          <strong>{entry.title}</strong>
          {entry.description && <p>{entry.description}</p>}
        </div>
        {!!entry.actions?.length && (
          <div className={styles.actions}>
            {entry.actions.map((action) => (
              <Button key={action.label} onClick={action.onClick}>
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </div>
      {entry.dismissible !== false && (
        <Button
          className={styles.close}
          aria-label={`关闭通知：${entry.title}`}
          onClick={() => store.dismiss(entry.id)}
        >
          <Icon name="close" />
        </Button>
      )}
      {entry.progress !== undefined && (
        <div
          className={styles.progress}
          role="progressbar"
          aria-label={`${entry.title} 进度`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={entry.progress ?? undefined}
          data-indeterminate={entry.progress === null}
        >
          <span
            style={
              entry.progress === null
                ? undefined
                : { width: `${Math.max(0, Math.min(100, entry.progress))}%` }
            }
          />
        </div>
      )}
      {entry.countdown && duration > 0 && (
        <div className={styles.countdown} aria-hidden="true">
          <span
            key={entry.version}
            style={{
              animationDuration: `${duration}ms`,
              animationPlayState:
                hovered || focused || entry.closing ? "paused" : "running",
            }}
          />
        </div>
      )}
    </div>
  );
}
