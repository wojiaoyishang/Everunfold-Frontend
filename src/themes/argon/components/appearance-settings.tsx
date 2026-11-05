"use client";
import { UiText } from "@/core/i18n/provider";

import { Button } from "@/themes/argon/components/ui/primitives";
import { Checkbox } from "@/themes/argon/components/ui/checkbox";

import { ColorPicker } from "./ui/color-picker";
import { Icon } from "./icon";
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
        <legend>
          <UiText text="外观" />
        </legend>
        <div className="setting-options">
          {(
            [
              ["system", "跟随系统"],
              ["light", "浅色"],
              ["dark", "深色"],
            ] as const
          ).map(([mode, label]) => (
            <Button
              type="button"
              key={mode}
              aria-pressed={value.mode === mode}
              onClick={() => setAppearance({ mode })}
            >
              {label}
            </Button>
          ))}
        </div>
      </fieldset>
      <label className="appearance-check">
        <Checkbox
          checked={value.amoled}
          onChange={(event) => setAppearance({ amoled: event.target.checked })}
        />
        <UiText text="深色时使用纯黑背景" />
      </label>
      <fieldset>
        <legend>
          <UiText text="主题色" />
        </legend>
        <div className="accent-options">
          {colors.map(([accent, label]) => (
            <Button
              type="button"
              key={accent}
              aria-label={label}
              title={label}
              aria-pressed={value.accent === accent}
              style={{ backgroundColor: accent }}
              onClick={() => setAppearance({ accent })}
            >
              {value.accent === accent && <Icon name="check" />}
            </Button>
          ))}
          <ColorPicker
            value={value.accent}
            onChange={(accent) => setAppearance({ accent })}
          />
        </div>
        <p className="setting-hint">
          <UiText text="文字颜色会适配深浅背景，保持清晰" />
        </p>
      </fieldset>
    </>
  );
}
