"use client";

import { createContext, useContext, useSyncExternalStore } from "react";
import { fontScaleLimits } from "@/core/settings/theme-options";
import {
  fontScaleKey,
  fontScaleOverride,
  validFontScale,
} from "@/core/browser/font-scale-policy";

const changeEvent = "everunfold:font-scale";
let memory: number | null = null;

function applyPreference(percent: number | null) {
  const root = document.documentElement.style;
  if (percent === null) root.removeProperty(fontScaleOverride);
  else root.setProperty(fontScaleOverride, String(percent / 100));
}

function readPreference() {
  try {
    const value = Number(localStorage.getItem(fontScaleKey));
    memory = validFontScale(value) ? value : null;
  } catch {
    // The current tab still applies the preference with storage disabled.
  }
  return memory;
}

function subscribe(listener: () => void) {
  const storage = (event: StorageEvent) => {
    if (event.key === fontScaleKey || event.key === null) {
      applyPreference(readPreference());
      listener();
    }
  };
  window.addEventListener(changeEvent, listener);
  window.addEventListener("storage", storage);
  return () => {
    window.removeEventListener(changeEvent, listener);
    window.removeEventListener("storage", storage);
  };
}

export function setFontScalePreference(percent: number | null) {
  if (percent !== null && !validFontScale(percent)) return;
  memory = percent;
  applyPreference(percent);
  try {
    if (percent === null) localStorage.removeItem(fontScaleKey);
    else localStorage.setItem(fontScaleKey, String(percent));
  } catch {
    // Storage is optional.
  }
  window.dispatchEvent(new Event(changeEvent));
}

export function useFontScalePreference(defaultPercent: number) {
  const preference = useSyncExternalStore(
    subscribe,
    readPreference,
    () => null,
  );
  return preference ?? defaultPercent;
}

export const PublicFontScale = createContext<number>(fontScaleLimits.default);

export function usePublicFontScale() {
  return useContext(PublicFontScale);
}
