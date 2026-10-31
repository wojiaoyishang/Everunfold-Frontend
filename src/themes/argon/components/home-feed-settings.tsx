"use client";
import { useEffect } from "react";
import {
  preferredHomeHref,
  type HomeFeedType,
} from "@/core/browser/home-feed-policy";
import { useHomeFeed } from "../hooks/use-home-feed";
import { useRouteState } from "./route-state";

export function HomeFeedSettings({
  value,
  onChange,
}: {
  value: HomeFeedType;
  onChange: (type: HomeFeedType) => void;
}) {
  return (
    <fieldset>
      <legend>首页内容</legend>
      <div className="setting-options">
        {(
          [
            ["all", "全部动态"],
            ["article", "仅文章"],
            ["shuoshuo", "仅说说"],
          ] as const
        ).map(([type, label]) => (
          <button
            key={type}
            type="button"
            aria-pressed={value === type}
            onClick={() => onChange(type)}
          >
            {label}
          </button>
        ))}
      </div>
      <p className="setting-hint">记住首页浏览偏好，不影响搜索和说说归档</p>
    </fieldset>
  );
}

/** Restore direct visits after hydration; server output always follows the explicit public URL. */
export function HomeFeedPreference() {
  const { saved } = useHomeFeed();
  const { route, navigate, pending } = useRouteState();
  useEffect(() => {
    if (pending) return;
    const destination = preferredHomeHref(route, window.location.href, saved);
    if (destination !== route)
      navigate(destination, { replace: true, scroll: false });
  }, [route, navigate, pending, saved]);
  return null;
}
