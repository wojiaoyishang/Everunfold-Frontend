import { useCallback, useSyncExternalStore } from "react";
import { useAdminRequest } from "@everunfold/plugin-sdk/client";
import { readAvailability, type AdminRequest } from "./client";
import type { Availability } from "./contract";

const interval = 30_000;

interface Subscription {
  value: Availability | null;
  listeners: Set<() => void>;
  controller?: AbortController;
  timer: ReturnType<typeof setInterval>;
}

const subscriptions = new Map<string, Subscription>();
const keyOf = (admin: AdminRequest) =>
  JSON.stringify([admin.baseUrl, admin.csrfToken]);

function refresh(subscription: Subscription, admin: AdminRequest) {
  subscription.controller?.abort();
  const controller = new AbortController();
  subscription.controller = controller;
  void readAvailability(admin, controller.signal)
    .catch(() => null)
    .then((value) => {
      if (controller.signal.aborted) return;
      subscription.value = value;
      subscription.listeners.forEach((listener) => listener());
    });
}

export function refreshAvailability(admin: AdminRequest) {
  const subscription = subscriptions.get(keyOf(admin));
  if (subscription) refresh(subscription, admin);
}

function subscribe(admin: AdminRequest, listener: () => void) {
  const key = keyOf(admin);
  let subscription = subscriptions.get(key);
  if (!subscription) {
    subscription = {
      value: null,
      listeners: new Set(),
      timer: setInterval(() => {
        if (document.visibilityState === "visible") refreshAvailability(admin);
      }, interval),
    };
    subscriptions.set(key, subscription);
    refresh(subscription, admin);
  }
  const entry = subscription;
  entry.listeners.add(listener);
  return () => {
    entry.listeners.delete(listener);
    // Keep the entry when React renews a subscription in this commit.
    queueMicrotask(() => {
      if (entry.listeners.size) return;
      entry.controller?.abort();
      clearInterval(entry.timer);
      subscriptions.delete(key);
    });
  };
}

const empty = () => null;

export function useWritingAvailability(writable: boolean) {
  const { baseUrl, csrfToken } = useAdminRequest();
  const subscribeToWorkspace = useCallback(
    (listener: () => void) =>
      writable ? subscribe({ baseUrl, csrfToken }, listener) : () => {},
    [baseUrl, csrfToken, writable],
  );
  return useSyncExternalStore(
    subscribeToWorkspace,
    () =>
      writable
        ? (subscriptions.get(keyOf({ baseUrl, csrfToken }))?.value ?? null)
        : null,
    empty,
  );
}
