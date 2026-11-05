"use client";
import { UiText } from "@/core/i18n/provider";

import { Button, Popover } from "@/themes/argon/components/ui/primitives";
import { RangeField } from "@/themes/argon/components/ui/range-field";

import { useEffect, useId, useState } from "react";
import { Switch } from "./ui/switch";
import { Icon } from "./icon";
import { useMotion } from "../hooks/use-motion";
import { useBackgroundPlayback } from "./background-video";
import { AppearanceSettings } from "./appearance-settings";
import { setAppearance } from "@/core/browser/appearance";
import { defaultAppearance } from "@/core/browser/appearance-policy";
import { HomeFeedSettings } from "./home-feed-settings";
import { useHomeFeed } from "../hooks/use-home-feed";

const defaults = {
  size: 16.5,
  radius: 8,
  serif: false,
  shadow: false,
  filter: "none",
};
type Settings = typeof defaults;
const storageKey = "everunfold.reading-settings";

function readSettings(): Settings {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "null");
    if (!value || typeof value !== "object") return defaults;
    return {
      size: Number.isFinite(value.size)
        ? Math.max(14, Math.min(22, value.size))
        : defaults.size,
      radius: Number.isFinite(value.radius)
        ? Math.max(0, Math.min(20, value.radius))
        : defaults.radius,
      serif: value.serif === true,
      shadow: value.shadow === true,
      filter: ["none", "sunset", "dim", "gray"].includes(value.filter)
        ? value.filter
        : "none",
    };
  } catch {
    return defaults;
  }
}

function applySettings(value: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--reading-font-size", `${value.size}px`);
  root.style.setProperty("--radius", `${value.radius}px`);
  root.dataset.readingFont = value.serif ? "serif" : "sans";
  root.dataset.readingShadow = value.shadow ? "deep" : "light";
  root.dataset.readingFilter = value.filter;
}

export function ReadingSettings() {
  const panelId = useId();
  const motion = useMotion();
  const playback = useBackgroundPlayback();
  const homeFeed = useHomeFeed();
  const [settings, setSettings] = useState(defaults);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const saved = readSettings();
      setSettings(saved);
      applySettings(saved);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  function update(value: Partial<Settings>) {
    const next = { ...settings, ...value };
    setSettings(next);
    applySettings(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* Optional preference. */
    }
  }
  return (
    <>
      <Button
        type="button"
        className="floating-button"
        aria-label="阅读设置"
        title="阅读设置"
        popoverTarget={panelId}
        aria-haspopup="dialog"
      >
        <Icon name="settings" />
      </Button>
      <Popover
        id={panelId}
        popover="auto"
        role="dialog"
        className="reading-settings"
        aria-labelledby="reading-settings-title"
      >
        <div className="settings-content">
          <header>
            <h2 id="reading-settings-title">
              <UiText text="阅读设置" />
            </h2>
            <Button
              type="button"
              className="icon-button"
              aria-label="关闭阅读设置"
              popoverTarget={panelId}
              popoverTargetAction="hide"
            >
              <Icon name="close" />
            </Button>
          </header>
          <AppearanceSettings />
          <HomeFeedSettings
            value={homeFeed.value}
            onChange={homeFeed.setValue}
          />
          <fieldset>
            <legend>
              <UiText text="全站动效" />
            </legend>
            <div className="setting-options">
              {(
                [
                  ["full", "完整动效"],
                  ["system", "跟随系统"],
                  ["reduced", "减少动态"],
                ] as const
              ).map(([value, label]) => (
                <Button
                  type="button"
                  key={value}
                  aria-pressed={motion.preference === value}
                  onClick={() => motion.setPreference(value)}
                >
                  {label}
                </Button>
              ))}
            </div>
            <p className="setting-hint">
              <UiText text="控制滚动惯性和界面动画，背景可单独设置" />
            </p>
          </fieldset>
          <div className="setting-playback">
            <div>
              <span id={`${panelId}-background`}>
                <UiText text="动态背景" />
              </span>
              <p className="setting-hint">{playback.description}</p>
            </div>
            <Switch
              aria-labelledby={`${panelId}-background`}
              checked={playback.enabled}
              onCheckedChange={playback.setEnabled}
            />
          </div>
          {playback.needsRetry && (
            <Button
              type="button"
              className="settings-reset"
              onClick={() => playback.setEnabled(true)}
            >
              <UiText text="重试背景播放" />
            </Button>
          )}
          <fieldset>
            <legend>
              <UiText text="字体" />
            </legend>
            <div className="setting-options">
              <Button
                type="button"
                aria-pressed={!settings.serif}
                onClick={() => update({ serif: false })}
              >
                Sans Serif
              </Button>
              <Button
                type="button"
                aria-pressed={settings.serif}
                onClick={() => update({ serif: true })}
              >
                Serif
              </Button>
            </div>
          </fieldset>
          <label className="setting-range">
            <UiText text="字号" />
            <output>{settings.size} px</output>
            <RangeField
              aria-label="正文字号"
              min="14"
              max="22"
              step="0.5"
              value={settings.size}
              onChange={(event) => update({ size: Number(event.target.value) })}
            />
          </label>
          <fieldset>
            <legend>
              <UiText text="阴影" />
            </legend>
            <div className="setting-options">
              <Button
                type="button"
                aria-pressed={!settings.shadow}
                onClick={() => update({ shadow: false })}
              >
                <UiText text="浅阴影" />
              </Button>
              <Button
                type="button"
                aria-pressed={settings.shadow}
                onClick={() => update({ shadow: true })}
              >
                <UiText text="深阴影" />
              </Button>
            </div>
          </fieldset>
          <fieldset>
            <legend>
              <UiText text="滤镜" />
            </legend>
            <div className="setting-options">
              {[
                ["none", "关闭"],
                ["sunset", "日落"],
                ["dim", "暗化"],
                ["gray", "灰度"],
              ].map(([value, label]) => (
                <Button
                  type="button"
                  key={value}
                  aria-pressed={settings.filter === value}
                  onClick={() => update({ filter: value })}
                >
                  {label}
                </Button>
              ))}
            </div>
          </fieldset>
          <label className="setting-range">
            <UiText text="圆角" />
            <output>{settings.radius} px</output>
            <RangeField
              aria-label="卡片圆角"
              min="0"
              max="20"
              value={settings.radius}
              onChange={(event) =>
                update({ radius: Number(event.target.value) })
              }
            />
          </label>
          <Button
            type="button"
            className="settings-reset"
            onClick={() => {
              update(defaults);
              motion.setPreference("full");
              playback.reset();
              setAppearance(defaultAppearance);
              homeFeed.setValue("all");
            }}
          >
            <UiText text="恢复默认" />
          </Button>
          <p className="settings-persistence">
            <UiText text="偏好自动保存在当前浏览器" />
          </p>
        </div>
      </Popover>
    </>
  );
}
