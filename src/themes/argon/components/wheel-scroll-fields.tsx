"use client";

import { useId } from "react";
import type { WheelScrollPreferences } from "@/core/contracts/settings";
import {
  wheelScrollLimits,
  wheelScrollStep,
  type WheelScroll,
} from "@/core/browser/wheel-scroll-policy";
import { UiText } from "@/core/i18n/provider";
import { RangeField } from "./ui/range-field";
import { Switch } from "./ui/switch";

const fields = [
  ["inertia_ms", "惯性时长", " ms"],
  ["distance_percent", "每格滚动距离", "%"],
  ["acceleration_percent", "连续滚动加速", "%"],
] as const;

export function WheelScrollFields({
  value,
  onChange,
  compact = false,
  disabled = false,
  reducedMotion = false,
}: {
  value: WheelScroll;
  onChange: (patch: WheelScrollPreferences) => void;
  compact?: boolean;
  disabled?: boolean;
  reducedMotion?: boolean;
}) {
  const id = useId();
  return (
    <>
      <div
        className={compact ? "setting-wheel-toggle" : "admin-settings-toggle"}
      >
        <span id={`${id}-enabled`}>
          <UiText text="启用滚轮惯性" />
        </span>
        <Switch
          aria-labelledby={`${id}-enabled`}
          checked={value.enabled}
          disabled={disabled}
          onCheckedChange={(enabled) => onChange({ enabled })}
        />
      </div>
      {fields.map(([key, label, unit]) => {
        const labelId = `${id}-${key}`;
        const display = `${value[key]}${unit}`;
        return (
          <label
            key={key}
            className={compact ? "setting-range" : "admin-settings-field"}
          >
            <span>
              <span id={labelId}>
                <UiText text={label} />
              </span>{" "}
              <output>{display}</output>
            </span>
            <RangeField
              {...wheelScrollLimits[key]}
              step={wheelScrollStep}
              aria-labelledby={labelId}
              aria-valuetext={display}
              value={value[key]}
              disabled={disabled || !value.enabled || reducedMotion}
              onChange={(event) =>
                onChange({ [key]: event.currentTarget.valueAsNumber })
              }
            />
          </label>
        );
      })}
    </>
  );
}
