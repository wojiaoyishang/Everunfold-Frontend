"use client";

import { useSyncExternalStore } from "react";
import {
  motionSnapshot,
  setMotionPreference,
  subscribeMotion,
} from "@/core/browser/motion";
import { motionPreference } from "@/core/browser/motion-policy";

export function useMotion() {
  const [preference, enabled] = useSyncExternalStore(
    subscribeMotion,
    motionSnapshot,
    () => "full:1",
  ).split(":");
  return {
    preference: motionPreference(preference),
    enabled: enabled === "1",
    setPreference: setMotionPreference,
  };
}
