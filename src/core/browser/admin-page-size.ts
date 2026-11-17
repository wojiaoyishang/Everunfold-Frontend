"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

export const adminPageSizes: readonly number[] = [10, 12, 20, 30, 50];
const defaultPageSize = 12;

export function useAdminPageSize(list: string) {
  const key = `everunfold.admin.page-size.${list}`;
  const [temporary, setTemporary] = useState<{ key: string; size: number }>();
  const subscribe = useCallback(
    (listener: () => void) => {
      const onStorage = (event: StorageEvent) => {
        if (event.key === key || event.key === null) listener();
      };
      window.addEventListener("storage", onStorage);
      window.addEventListener(key, listener);
      return () => {
        window.removeEventListener("storage", onStorage);
        window.removeEventListener(key, listener);
      };
    },
    [key],
  );
  const read = useCallback(() => {
    try {
      const stored = Number(localStorage.getItem(key));
      if (adminPageSizes.includes(stored)) return stored;
    } catch {}
    return defaultPageSize;
  }, [key]);
  const saved = useSyncExternalStore(subscribe, read, () => defaultPageSize);
  const pageSize = temporary?.key === key ? temporary.size : saved;

  function setPageSize(size: number) {
    if (!adminPageSizes.includes(size)) return;
    try {
      localStorage.setItem(key, String(size));
      setTemporary(undefined);
      window.dispatchEvent(new Event(key));
    } catch {
      setTemporary({ key, size });
    }
  }
  return { pageSize, setPageSize };
}
