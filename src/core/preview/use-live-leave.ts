"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { randomUUID } from "@/core/browser/crypto";
import { useEditorNavigation } from "@/core/content-management/use-editor-navigation";

const back = "@history-back";
/** An in-app guard owns its same-URL history sentinel; embedded editors never raise native prompts. */
export function useLiveLeave(fallback: string, dirty: boolean, busy: boolean) {
  const [destination, setDestination] = useState("");
  const sentinel = useRef(randomUUID());
  const installed = useRef(false),
    hadBack = useRef(false),
    allowed = useRef(false);
  const navigate = useCallback(
    (href: string) => {
      allowed.current = true;
      if (href === back && hadBack.current) history.go(-2);
      else location.assign(href === back ? fallback : href);
    },
    [fallback],
  );
  const request = useCallback(
    (href: string, force = false) => {
      if (busy) return;
      if (dirty || force) setDestination(href);
      else navigate(href);
    },
    [dirty, busy, navigate],
  );
  useEditorNavigation(dirty, busy, request);
  useEffect(() => {
    if (!installed.current) {
      hadBack.current = history.length > 1;
      history.pushState(
        { ...history.state, everunfoldLiveGuard: sentinel.current },
        "",
        location.href,
      );
      installed.current = true;
    }
    const pop = (event: PopStateEvent) => {
      if (
        allowed.current ||
        event.state?.everunfoldLiveGuard === sentinel.current
      )
        return;
      if (!dirty && !busy) {
        allowed.current = true;
        if (hadBack.current) history.back();
        else location.assign(fallback);
        return;
      }
      // The preceding entry has the same URL, so restoring it never unloads the editor.
      history.forward();
      request(back);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [request, dirty, busy, fallback]);
  return {
    destination,
    request,
    cancel: () => setDestination(""),
    leave: () => navigate(destination),
  };
}
