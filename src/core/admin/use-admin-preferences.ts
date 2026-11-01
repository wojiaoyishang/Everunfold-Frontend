"use client";
import { useEffect, useState } from "react";
import {
  adminPreferences,
  parseAdminPreferences,
  type AdminPreferences,
} from "./preferences";

/** Mounted only inside the confirmed account boundary, keyed by backend and account. */
export function useAdminPreferences(storageKey: string) {
  const [preferences, setPreferences] = useState(() => {
    try {
      return parseAdminPreferences(localStorage.getItem(storageKey));
    } catch {
      return parseAdminPreferences(null);
    }
  });
  useEffect(() => {
    const receive = (event: StorageEvent) => {
      if (event.key === storageKey || event.key === null)
        setPreferences(parseAdminPreferences(event.newValue));
    };
    window.addEventListener("storage", receive);
    return () => window.removeEventListener("storage", receive);
  }, [storageKey]);
  function update(patch: Partial<AdminPreferences>) {
    const next = adminPreferences({ ...preferences, ...patch });
    setPreferences(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* This tab remains usable when storage is unavailable. */
    }
  }
  return { preferences, update };
}
