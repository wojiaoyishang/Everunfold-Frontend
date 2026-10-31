"use client";
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { NavigationTransaction } from "@/core/navigation/transaction";
import { prepareNavigationDocument } from "@/core/navigation/document";
import { preferredHomeHref } from "@/core/browser/home-feed-policy";
import { readHomeFeedPreference } from "@/core/browser/home-feed-preference";
import { stopScrolling } from "@/core/browser/scroll";
import {
  rememberScrollPosition,
  releaseScrollPosition,
  commitScrollPosition,
  installScrollRestoration,
} from "@/core/browser/scroll-restoration";

export interface NavigateOptions {
  replace?: boolean;
  scroll?: boolean;
}

export function usePageNavigation(route: string) {
  const router = useRouter();
  const [transaction] = useState(
    () =>
      new NavigationTransaction({
        prepare: (intent, signal) =>
          prepareNavigationDocument(intent.href, signal),
        commit(intent) {
          rememberScrollPosition();
          startTransition(() => {
            if (intent.replace) router.replace(intent.href, { scroll: false });
            else router.push(intent.href, { scroll: false });
          });
        },
        abandon(intent) {
          releaseScrollPosition();
          startTransition(() =>
            router.replace(intent.origin, { scroll: false }),
          );
        },
      }),
  );
  const feedback = useSyncExternalStore(
    transaction.subscribe,
    transaction.getSnapshot,
    transaction.getSnapshot,
  );
  useEffect(() => {
    const onPop = () => transaction.cancel(false);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      transaction.cancel(false);
    };
  }, [transaction]);
  useEffect(() => installScrollRestoration(), []);
  useLayoutEffect(() => {
    if (!document.querySelector('[data-page-ready="true"]')) {
      transaction.fail("render");
      return;
    }
    const intent = transaction.complete(route);
    let top: number | undefined;
    if (intent && intent.scroll !== false) {
      stopScrolling();
      const destination = new URL(intent.href, intent.origin);
      if (!destination.hash) {
        top =
          destination.pathname === "/"
            ? 0
            : Math.max(
                0,
                (document
                  .getElementById("main-content")
                  ?.getBoundingClientRect().top ?? 0) +
                  window.scrollY -
                  95,
              );
      }
    }
    // Run after the new DOM commits, before painting. Short pages cannot clamp the old view first.
    commitScrollPosition(top);
  }, [route, transaction]);
  const navigate = useCallback(
    (requestedHref: string, options: NavigateOptions = {}) => {
      const href = preferredHomeHref(
        requestedHref,
        window.location.href,
        readHomeFeedPreference(),
      );
      const destination = new URL(href, window.location.href);
      if (destination.href === window.location.href) {
        transaction.cancel();
        return;
      }
      if (destination.origin !== window.location.origin) return;
      transaction.start({
        href: `${destination.pathname}${destination.search}${destination.hash}`,
        origin: window.location.href,
        ...options,
      });
    },
    [transaction],
  );
  const cancel = useCallback(() => transaction.cancel(), [transaction]);
  const retry = useCallback(() => {
    const intent = transaction.getSnapshot().intent;
    if (intent)
      navigate(intent.href, { replace: intent.replace, scroll: intent.scroll });
  }, [navigate, transaction]);
  return {
    feedback,
    navigate,
    cancel,
    retry,
    pending: feedback.phase === "loading" || feedback.phase === "slow",
  };
}
