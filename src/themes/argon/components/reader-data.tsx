"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
  type ComponentType,
} from "react";
import { ReaderStore } from "@/core/reader/store";
import { emptyReaderSnapshot, type LoadState } from "@/core/reader/state";
import type { RequestOptions } from "@/core/http/request";
import { useRouteState } from "./route-state";
import { Icon } from "./icon";

const ReaderContext = createContext<ReaderStore | null>(null);
const ReaderBaseUrlContext = createContext<string | null>(null);
interface StatusSlot {
  route: string;
  component: ComponentType;
  token: symbol;
}
const StatusSlotsContext = createContext<{
  slots: Record<string, StatusSlot>;
  register: (
    route: string,
    key: string,
    component: ComponentType,
  ) => () => void;
} | null>(null);

export function ReaderDataProvider({
  baseUrl,
  children,
}: {
  baseUrl: string;
  children: ReactNode;
}) {
  const { route, site } = useRouteState();
  const policy = site.cachePolicy;
  const store = useMemo(
    () =>
      new ReaderStore(baseUrl, {
        timeoutMs: (policy?.request_timeout_seconds ?? 8) * 1000,
        freshnessMs: (policy?.dynamic_freshness_seconds ?? 30) * 1000,
        retryDelayMs: policy?.retry_delay_ms ?? 1500,
        batchDelayMs: policy?.batch_delay_ms ?? 24,
      }),
    [
      baseUrl,
      policy?.request_timeout_seconds,
      policy?.dynamic_freshness_seconds,
      policy?.retry_delay_ms,
      policy?.batch_delay_ms,
    ],
  );
  const [slots, setSlots] = useState<Record<string, StatusSlot>>({});
  const register = useCallback(
    (route: string, key: string, component: ComponentType) => {
      const token = Symbol(key);
      setSlots((current) => ({
        ...current,
        [key]: { route, component, token },
      }));
      return () =>
        setSlots((current) => {
          if (current[key]?.token !== token) return current;
          const next = { ...current };
          delete next[key];
          return next;
        });
    },
    [],
  );
  useEffect(() => {
    store.beginPage(route);
  }, [route, store]);
  useEffect(() => {
    const network = () => store.setOnline(navigator.onLine);
    const visible = () => {
      if (!document.hidden) store.refreshIfStale();
    };
    network();
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("focus", visible);
    document.addEventListener("visibilitychange", visible);
    return () => {
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("focus", visible);
      document.removeEventListener("visibilitychange", visible);
      store.dispose();
    };
  }, [store]);
  return (
    <ReaderBaseUrlContext.Provider value={baseUrl}>
      <ReaderContext.Provider value={store}>
        <StatusSlotsContext.Provider value={{ slots, register }}>
          {children}
        </StatusSlotsContext.Provider>
      </ReaderContext.Provider>
    </ReaderBaseUrlContext.Provider>
  );
}

export function useOptionalReaderBaseUrl() {
  return useContext(ReaderBaseUrlContext);
}

export function useReaderBaseUrl() {
  const value = useOptionalReaderBaseUrl();
  if (!value)
    throw new Error("Reader endpoint requires the shared public shell");
  return value;
}

export function useStatusSlot(key: string, component: ComponentType) {
  const context = useContext(StatusSlotsContext);
  if (!context) throw new Error("Status slots require the shared public shell");
  const { register } = context;
  const { route } = useRouteState();
  useEffect(
    () => register(route, key, component),
    [register, route, key, component],
  );
}

export function DynamicStatusExtensions() {
  const context = useContext(StatusSlotsContext);
  const { route } = useRouteState();
  if (!context) return null;
  return (
    <>
      {Object.entries(context.slots)
        .filter(([, slot]) => slot.route === route)
        .map(([key, slot]) => {
          const Content = slot.component;
          return <Content key={key} />;
        })}
    </>
  );
}

export function useReaderData() {
  const store = useContext(ReaderContext);
  if (!store) throw new Error("Reader data requires the shared public shell");
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getServerSnapshot,
  );
  const { route } = useRouteState();
  return {
    store,
    route,
    snapshot: snapshot.route === route ? snapshot : emptyReaderSnapshot,
  };
}

/** Use a stable loader (module function or useCallback); the page owns its namespaced key. */
export function usePageRequest<T>(
  key: string | null,
  load: (options: RequestOptions) => Promise<T>,
) {
  const { store, route, snapshot } = useReaderData();
  useEffect(
    () => (key ? store.registerTask(route, key, load) : undefined),
    [store, route, key, load],
  );
  return (key ? snapshot.requests[key] : undefined) as LoadState<T> | undefined;
}

export function ViewMetric({ contentId }: { contentId: string }) {
  const { store, route, snapshot } = useReaderData();
  const element = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const target = element.current;
    if (!target) return;
    if (!("IntersectionObserver" in window)) {
      return store.watchMetric(route, contentId);
    }
    let release = () => {};
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        release = store.watchMetric(route, contentId);
        observer.disconnect();
      },
      { rootMargin: "120px" },
    );
    observer.observe(target);
    return () => {
      observer.disconnect();
      release();
    };
  }, [store, route, contentId]);
  const state = snapshot.metrics[contentId];
  const value = state?.status === "ready" ? state.value.views : null;
  return (
    <span
      ref={element}
      className="dynamic-metric"
      data-ready={value !== null}
      data-content-id={contentId}
      aria-hidden={value === null}
      aria-label={value === null ? undefined : `浏览量：${value}`}
      title={value === null ? undefined : "开发预览数据，尚未接入真实访问统计"}
    >
      <span className="dynamic-metric-sizer">
        {value !== null && (
          <span className="dynamic-metric-value">
            <Icon name="eye" />
            <span>{value.toLocaleString("zh-CN")}</span>
          </span>
        )}
      </span>
    </span>
  );
}
