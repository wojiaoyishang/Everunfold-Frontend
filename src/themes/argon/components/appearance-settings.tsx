"use client";
import { setAppearance } from "@/core/browser/appearance";
import { useAppearance } from "../hooks/use-appearance";
const colors = [
  ["#673bb7", "篝火紫"],
  ["#2466bd", "晴空蓝"],
  ["#237768", "森林绿"],
  ["#bb4371", "晚霞粉"],
  ["#aa5925", "暖茶橙"],
];
export function AppearanceSettings() {
  const value = useAppearance();
  return (
    <>
      <fieldset>
        <legend>外观</legend>
        <div className="setting-options">
          {(
            [
              ["system", "跟随系统"],
              ["light", "浅色"],
              ["dark", "深色"],
            ] as const
          ).map(([mode, label]) => (
            <button
              type="button"
              key={mode}
              aria-pressed={value.mode === mode}
              onClick={() => setAppearance({ mode })}
            >
              {label}
            </button>
          ))}
        </div>
      </fieldset>
      <label className="appearance-check">
        <input
          type="checkbox"
          checked={value.amoled}
          onChange={(event) => setAppearance({ amoled: event.target.checked })}
        />
        深色时使用纯黑背景
      </label>
      <fieldset>
        <legend>主题色</legend>
        <div className="accent-options">
          {colors.map(([accent, label]) => (
            <button
              type="button"
              key={accent}
              aria-label={label}
              title={label}
              aria-pressed={value.accent === accent}
              style={{ backgroundColor: accent }}
              onClick={() => setAppearance({ accent })}
            >
              {value.accent === accent ? "✓" : ""}
            </button>
          ))}
          <label title="自定义主题色">
            <input
              type="color"
              value={value.accent}
              aria-label="自定义主题色"
              onChange={(event) =>
                setAppearance({ accent: event.target.value })
              }
            />
            <span>自选</span>
          </label>
        </div>
        <p className="setting-hint">文字颜色会适配深浅背景，保持清晰</p>
      </fieldset>
    </>
  );
}
