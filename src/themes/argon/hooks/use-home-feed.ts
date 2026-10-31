"use client";
import { useSyncExternalStore } from "react";
import {
  changedHomeFeedHref,
  homeFeedType,
  isHomeFeed,
  type HomeFeedType,
} from "@/core/browser/home-feed-policy";
import {
  readHomeFeedPreference,
  setHomeFeedPreference,
  subscribeHomeFeedPreference,
} from "@/core/browser/home-feed-preference";
import { useRouteState } from "../components/route-state";

export function useHomeFeed() {
  const saved = useSyncExternalStore(
    subscribeHomeFeedPreference,
    readHomeFeedPreference,
    () => "all" as const,
  );
  const { route, navigate } = useRouteState();
  const url = new URL(route, "https://route.invalid");
  const value =
    isHomeFeed(url) && url.searchParams.has("type")
      ? homeFeedType(url.searchParams.get("type"))
      : saved;
  function setValue(next: HomeFeedType) {
    setHomeFeedPreference(next);
    const destination = changedHomeFeedHref(window.location.href, next);
    if (destination) navigate(destination, { replace: true, scroll: false });
  }
  return { saved, value, setValue };
}
