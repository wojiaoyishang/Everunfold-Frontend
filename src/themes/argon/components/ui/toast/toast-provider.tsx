"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
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
  // Select the current theme surface at publication time, including an active native modal.
  if (!entries.length || typeof document === "undefined") return null;
  const target =
    Array.from(document.querySelectorAll("dialog[open]")).at(-1) ??
    document.querySelector("[data-surface='admin'], .blog-shell, .auth-root") ??
    document.body;
  return createPortal(
    <section className={styles.viewport} aria-label="通知" tabIndex={-1}>
      {entries.map((entry) => (
        <Toast key={entry.id} entry={entry} store={store} />
      ))}
    </section>,
    target,
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
  }, [duration, tone]);
  useEffect(() => {
    if (!duration || entry.closing || hovered || focused) return;
    const started = Date.now();
    const timer = setTimeout(() => store.dismiss(entry.id), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(
        0,
        remaining.current - (Date.now() - started),
      );
    };
  }, [duration, entry.id, entry.closing, hovered, focused, store, tone]);
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
    </div>
  );
}
