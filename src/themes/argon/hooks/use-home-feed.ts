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
import { themeProfile } from "@/core/settings/theme-options";

export function useHomeFeed() {
  const saved = useSyncExternalStore(
    subscribeHomeFeedPreference,
    readHomeFeedPreference,
    () => null,
  );
  const { route, navigate, site } = useRouteState();
  const siteDefault = themeProfile(site.settings)?.feed.default_type ?? "all";
  const url = new URL(route, "https://route.invalid");
  const value =
    isHomeFeed(url) && url.searchParams.has("type")
      ? homeFeedType(url.searchParams.get("type"))
      : (saved ?? siteDefault);
  function setValue(next: HomeFeedType) {
    setHomeFeedPreference(next);
    const destination = changedHomeFeedHref(window.location.href, next);
    if (destination) navigate(destination, { replace: true, scroll: false });
  }
  return { saved, value, setValue };
}
