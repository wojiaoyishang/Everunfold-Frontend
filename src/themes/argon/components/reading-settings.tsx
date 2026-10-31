"use client";

import { useEffect, useId, useState } from "react";
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
      <button
        type="button"
        className="floating-button"
        aria-label="阅读设置"
        title="阅读设置"
        popoverTarget={panelId}
        aria-haspopup="dialog"
      >
        <Icon name="settings" />
      </button>
      <div
        id={panelId}
        popover="auto"
        role="dialog"
        className="reading-settings"
        aria-labelledby="reading-settings-title"
      >
        <div className="settings-content">
          <header>
            <h2 id="reading-settings-title">阅读设置</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="关闭阅读设置"
              popoverTarget={panelId}
              popoverTargetAction="hide"
            >
              <Icon name="close" />
            </button>
          </header>
          <AppearanceSettings />
          <HomeFeedSettings
            value={homeFeed.value}
            onChange={homeFeed.setValue}
          />
          <fieldset>
            <legend>全站动效</legend>
            <div className="setting-options">
              {(
                [
                  ["full", "完整动效"],
                  ["system", "跟随系统"],
                  ["reduced", "减少动态"],
                ] as const
              ).map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={motion.preference === value}
                  onClick={() => motion.setPreference(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="setting-hint">
              控制滚动惯性和界面动画，背景可单独设置
            </p>
          </fieldset>
          <div className="setting-playback">
            <div>
              <span id={`${panelId}-background`}>动态背景</span>
              <p className="setting-hint">{playback.description}</p>
            </div>
            <button
              type="button"
              className="setting-switch"
              role="switch"
              aria-labelledby={`${panelId}-background`}
              aria-checked={playback.enabled}
              onClick={() => playback.setEnabled(!playback.enabled)}
            >
              <span />
            </button>
          </div>
          {playback.needsRetry && (
            <button
              type="button"
              className="settings-reset"
              onClick={() => playback.setEnabled(true)}
            >
              重试背景播放
            </button>
          )}
          <fieldset>
            <legend>字体</legend>
            <div className="setting-options">
              <button
                type="button"
                aria-pressed={!settings.serif}
                onClick={() => update({ serif: false })}
              >
                Sans Serif
              </button>
              <button
                type="button"
                aria-pressed={settings.serif}
                onClick={() => update({ serif: true })}
              >
                Serif
              </button>
            </div>
          </fieldset>
          <label className="setting-range">
            字号 <output>{settings.size} px</output>
            <input
              aria-label="正文字号"
              type="range"
              min="14"
              max="22"
              step="0.5"
              value={settings.size}
              onChange={(event) => update({ size: Number(event.target.value) })}
            />
          </label>
          <fieldset>
            <legend>阴影</legend>
            <div className="setting-options">
              <button
                type="button"
                aria-pressed={!settings.shadow}
                onClick={() => update({ shadow: false })}
              >
                浅阴影
              </button>
              <button
                type="button"
                aria-pressed={settings.shadow}
                onClick={() => update({ shadow: true })}
              >
                深阴影
              </button>
            </div>
          </fieldset>
          <fieldset>
            <legend>滤镜</legend>
            <div className="setting-options">
              {[
                ["none", "关闭"],
                ["sunset", "日落"],
                ["dim", "暗化"],
                ["gray", "灰度"],
              ].map(([value, label]) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={settings.filter === value}
                  onClick={() => update({ filter: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
          <label className="setting-range">
            圆角 <output>{settings.radius} px</output>
            <input
              aria-label="卡片圆角"
              type="range"
              min="0"
              max="20"
              value={settings.radius}
              onChange={(event) =>
                update({ radius: Number(event.target.value) })
              }
            />
          </label>
          <button
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
            恢复默认
          </button>
          <p className="settings-persistence">偏好自动保存在当前浏览器</p>
        </div>
      </div>
    </>
  );
}
