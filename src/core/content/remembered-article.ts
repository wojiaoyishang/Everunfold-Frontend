"use client";

import { useCallback, useSyncExternalStore } from "react";
import contract from "@/core/contracts/content-access-v1-schema";
import { RequestError } from "@/core/http/request";

const policy = contract["x-everunfold-read-receipt"];
const changedEvent = "everunfold:article-read";
const receiptPattern = /^[A-Za-z0-9_-]{43}$/;

interface SavedRead {
  receipt: string;
  expiresAt: number;
}

function storageKey(baseUrl: string, id: string) {
  return `everunfold.article-read.v1:${encodeURIComponent(baseUrl)}:${id}`;
}

function read(key: string): SavedRead | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw.length > 128) return null;
    const value = JSON.parse(raw);
    return typeof value?.receipt === "string" &&
      receiptPattern.test(value.receipt) &&
      Number.isSafeInteger(value.expiresAt)
      ? { receipt: value.receipt, expiresAt: value.expiresAt }
      : null;
  } catch {
    return null;
  }
}

function notify(key: string) {
  window.dispatchEvent(new CustomEvent(changedEvent, { detail: key }));
}

function remove(key: string, receipt: string) {
  try {
    // A response for an older grant must not erase a new unlock in another tab.
    if (read(key)?.receipt !== receipt) return;
    localStorage.removeItem(key);
  } catch {
    return;
  }
  notify(key);
}

export function rememberArticleRead(
  baseUrl: string,
  id: string,
  receipt: string | undefined,
  requestedAt: number,
) {
  const expiresAt = requestedAt + policy.expires_in * 1000;
  if (!receipt || !receiptPattern.test(receipt) || expiresAt <= Date.now())
    return false;
  const key = storageKey(baseUrl, id);
  try {
    localStorage.setItem(key, JSON.stringify({ receipt, expiresAt }));
  } catch {
    return false;
  }
  notify(key);
  return true;
}

export function forgetArticleRead(
  baseUrl: string,
  id: string,
  receipt: string,
) {
  remove(storageKey(baseUrl, id), receipt);
}

export function articleReadHeaders(receipt: string) {
  return { [policy.header]: receipt };
}

export function unavailableArticleRead(reason: unknown) {
  return (
    reason instanceof RequestError &&
    (reason.status === 404 || reason.code === 40388 || reason.code === 40986)
  );
}

export function useRememberedArticleRead(baseUrl: string, id?: string) {
  const key = id ? storageKey(baseUrl, id) : "";
  const subscribe = useCallback(
    (listener: () => void) => {
      if (!key) return () => {};
      let timer: ReturnType<typeof setTimeout> | undefined;
      const refresh = () => {
        clearTimeout(timer);
        const saved = read(key);
        if (saved) {
          const remaining = saved.expiresAt - Date.now();
          if (remaining > 0) {
            timer = setTimeout(refresh, Math.min(remaining, 2147483647));
          } else {
            remove(key, saved.receipt);
          }
        }
        listener();
      };
      const storage = (event: StorageEvent) => {
        if (event.key === null || event.key === key) refresh();
      };
      const changed = (event: Event) => {
        if ((event as CustomEvent<string>).detail === key) refresh();
      };
      window.addEventListener("storage", storage);
      window.addEventListener(changedEvent, changed);
      window.addEventListener("pageshow", refresh);
      document.addEventListener("visibilitychange", refresh);
      refresh();
      return () => {
        clearTimeout(timer);
        window.removeEventListener("storage", storage);
        window.removeEventListener(changedEvent, changed);
        window.removeEventListener("pageshow", refresh);
        document.removeEventListener("visibilitychange", refresh);
      };
    },
    [key],
  );
  const snapshot = useCallback(() => {
    const saved = key ? read(key) : null;
    return saved && saved.expiresAt > Date.now() ? saved.receipt : null;
  }, [key]);
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
