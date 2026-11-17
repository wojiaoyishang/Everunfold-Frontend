"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { WheelScrollPreferences } from "@/core/contracts/settings";
import {
  defaultWheelScroll,
  parseWheelScrollPreference,
} from "./wheel-scroll-policy";

const key = "everunfold.wheel-scroll";
const changeEvent = "everunfold:wheel-scroll";
let snapshot: string | undefined;

function refreshPreference() {
  try {
    snapshot = localStorage.getItem(key) ?? "";
  } catch {
    snapshot ??= "";
  }
}

function readPreference() {
  if (snapshot === undefined) refreshPreference();
  return snapshot ?? "";
}

function subscribe(listener: () => void) {
  refreshPreference();
  const onStorage = (event: StorageEvent) => {
    if (event.key === key || event.key === null) {
      refreshPreference();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(changeEvent, listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(changeEvent, listener);
  };
}

export function setWheelScrollPreference(patch: WheelScrollPreferences | null) {
  const next = patch
    ? JSON.stringify({
        ...parseWheelScrollPreference(readPreference()),
        ...patch,
      })
    : "";
  snapshot = next;
  try {
    if (next) localStorage.setItem(key, next);
    else localStorage.removeItem(key);
  } catch {
    // Apply for the current tab when browser storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function useWheelScrollPreference(
  themeDefaults?: WheelScrollPreferences,
) {
  const raw = useSyncExternalStore(subscribe, readPreference, () => "");
  const overrides = useMemo(() => parseWheelScrollPreference(raw), [raw]);
  return {
    value: { ...defaultWheelScroll, ...themeDefaults, ...overrides },
    customized: Object.keys(overrides).length > 0,
  };
}
