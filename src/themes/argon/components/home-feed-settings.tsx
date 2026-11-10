"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "@/themes/argon/components/ui/primitives";

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
      <legend>
        <UiText text="首页内容" />
      </legend>
      <div className="setting-options">
        {(
          [
            ["all", "全部动态"],
            ["article", "仅文章"],
            ["shuoshuo", "仅说说"],
          ] as const
        ).map(([type, label]) => (
          <Button
            key={type}
            type="button"
            aria-pressed={value === type}
            onClick={() => onChange(type)}
          >
            {label}
          </Button>
        ))}
      </div>
      <p className="setting-hint">
        <UiText text="记住首页浏览偏好，不影响搜索和说说归档" />
      </p>
    </fieldset>
  );
}

/** Restore direct visits after hydration; server output always follows the explicit public URL. */
export function HomeFeedPreference() {
  const { value } = useHomeFeed();
  const { route, navigate, pending } = useRouteState();
  useEffect(() => {
    if (pending) return;
    const { pathname, search, hash, href } = window.location;
    const current = `${pathname}${search}${hash}`;
    const destination = preferredHomeHref(current, href, value);
    if (destination !== current)
      navigate(destination, { replace: true, scroll: false });
  }, [route, navigate, pending, value]);
  return null;
}
