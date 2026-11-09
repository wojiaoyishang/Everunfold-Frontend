"use client";
import { useEffect, useState } from "react";
import { useAdminAccount, useAdminRequest } from "@/core/admin/account-context";
import { adminPreferencesKey } from "@/core/admin/preferences";

export type ThemeView = "cards" | "list";
function read(key: string): ThemeView {
  try {
    return localStorage.getItem(key) === "list" ? "list" : "cards";
  } catch {
    return "cards";
  }
}
export function useThemeView() {
  const account = useAdminAccount(),
    { baseUrl } = useAdminRequest();
  const key = adminPreferencesKey(baseUrl, account.id) + ":themes";
  const [view, setView] = useState<ThemeView>("cards");
  useEffect(() => {
    let mounted = true;
    queueMicrotask(() => {
      if (mounted) setView(read(key));
    });
    const receive = (event: StorageEvent) => {
      if (event.key === key || event.key === null) setView(read(key));
    };
    window.addEventListener("storage", receive);
    return () => {
      mounted = false;
      window.removeEventListener("storage", receive);
    };
  }, [key]);
  return {
    view,
    change: (next: ThemeView) => {
      setView(next);
      try {
        localStorage.setItem(key, next);
      } catch {
        /* The current view remains usable. */
      }
    },
  };
}
