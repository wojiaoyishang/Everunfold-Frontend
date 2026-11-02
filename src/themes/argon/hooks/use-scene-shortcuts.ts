"use client";
import { useEffect, useEffectEvent } from "react";
import {
  dispatchSceneShortcut,
  type SceneShortcut,
} from "@/core/keyboard-shortcuts";

/** The mounted page owns its scene; modal workflows keep their own keyboard semantics. */
export function useSceneShortcuts(bindings: readonly SceneShortcut[]) {
  const dispatch = useEffectEvent((event: KeyboardEvent) => {
    dispatchSceneShortcut(
      event,
      bindings,
      Boolean(document.querySelector("dialog[open]")),
    );
  });
  useEffect(() => {
    const listener = (event: KeyboardEvent) => dispatch(event);
    document.addEventListener("keydown", listener, true);
    return () => document.removeEventListener("keydown", listener, true);
  }, []);
}
