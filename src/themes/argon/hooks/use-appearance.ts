"use client";
import { useEffect, useSyncExternalStore } from "react";
import {
  applyAppearance,
  readAppearance,
  subscribeAppearance,
} from "@/core/browser/appearance";
import { defaultAppearance } from "@/core/browser/appearance-policy";
export function useAppearance() {
  const value = useSyncExternalStore(
    subscribeAppearance,
    readAppearance,
    () => defaultAppearance,
  );
  useEffect(() => {
    applyAppearance(value);
  }, [value]);
  return value;
}
