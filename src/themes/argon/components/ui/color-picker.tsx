"use client";
import { UiText, useT } from "@/core/i18n/provider";

import { useId, useState, type PointerEvent } from "react";
import {
  hexColor,
  hexToHsv,
  hsvToHex,
  rgbChannels,
  rgbHex,
  type HsvColor,
} from "@/core/colors";
import { Button, Popover, TextField } from "./primitives";
import { RangeField } from "./range-field";
import { useAnchoredPopover } from "./use-anchored-popover";

const swatches = [
  "#8b5cf6",
  "#3b82f6",
  "#198764",
  "#ce7923",
  "#d65580",
  "#e4dfed",
  "#f8fafc",
  "#172033",
];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function ColorPicker({
  value,
  onChange,
  label,
  disabled,
  compact,
}: {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  compact?: boolean;
}) {
  const id = useId();
  const t = useT();
  const triggerName = label ?? t("自定义主题色");
  const hexLabel = label ? "十六进制颜色" : "十六进制主题色";
  const {
    trigger,
    panel,
    open,
    ready,
    onBeforeToggle,
    onToggle,
    close,
    onPanelKeyDown,
  } = useAnchoredPopover(278, true);
  const [draft, setDraft] = useState<string | null>(null);
  const [picked, setPicked] = useState<{ hex: string; hsv: HsvColor } | null>(
    null,
  );
  const color = hexColor(value) ?? "#673bb7";
  const hsv = picked?.hex === color ? picked.hsv : hexToHsv(color);
  const channels = rgbChannels(color);
  const valid = draft === null || Boolean(hexColor(draft));
  const choose = (next: string) => {
    setDraft(null);
    setPicked(null);
    onChange(next);
  };
  const chooseHsv = (next: HsvColor) => {
    const hex = hsvToHex(next);
    setDraft(null);
    setPicked({ hex, hsv: next });
    onChange(hex);
  };
  const chooseFromPlane = (event: PointerEvent<HTMLButtonElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    chooseHsv({
      ...hsv,
      saturation: clamp((event.clientX - bounds.left) / bounds.width),
      value: clamp(1 - (event.clientY - bounds.top) / bounds.height),
    });
  };
  return (
    <span className="ui-color-picker">
      <Button
        ref={trigger}
        className="ui-color-trigger"
        aria-label={triggerName}
        title={triggerName}
        data-compact={compact || undefined}
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        popoverTarget={id}
        disabled={disabled || !ready}
        onClick={() => setDraft(null)}
      >
        <span style={{ backgroundColor: color }} aria-hidden="true" />
        {!compact && <UiText text="自选" />}
      </Button>
      <Popover
        ref={panel}
        id={id}
        onToggle={onToggle}
        onBeforeToggle={onBeforeToggle}
        onKeyDown={onPanelKeyDown}
        className="ui-color-panel ui-anchored-panel"
        role="dialog"
        aria-labelledby={`${id}-title`}
      >
        <strong id={`${id}-title`}>
          {label ?? <UiText text="调一杯自己的颜色" />}
        </strong>
        <div
          className="ui-color-swatches"
          role="group"
          aria-label={t("调色盘")}
        >
          {swatches.map((swatch) => (
            <Button
              key={swatch}
              className="ui-color-swatch"
              aria-label={t("预设色 {color}", { color: swatch })}
              title={swatch}
              aria-pressed={color === swatch}
              style={{ backgroundColor: swatch }}
              disabled={disabled}
              onClick={() => choose(swatch)}
            />
          ))}
        </div>
        <Button
          className="ui-color-plane"
          aria-label={t("饱和度与明度")}
          aria-describedby={`${id}-plane-help`}
          disabled={disabled}
          style={{ backgroundColor: `hsl(${hsv.hue} 100% 50%)` }}
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            chooseFromPlane(event);
          }}
          onPointerMove={(event) => {
            if (event.currentTarget.hasPointerCapture(event.pointerId))
              chooseFromPlane(event);
          }}
          onKeyDown={(event) => {
            const step = event.shiftKey ? 0.1 : 0.01;
            const { saturation, value } = hsv;
            const next = { ...hsv };
            if (event.key === "ArrowLeft")
              next.saturation = clamp(saturation - step);
            else if (event.key === "ArrowRight")
              next.saturation = clamp(saturation + step);
            else if (event.key === "ArrowUp") next.value = clamp(value + step);
            else if (event.key === "ArrowDown")
              next.value = clamp(value - step);
            else return;
            event.preventDefault();
            chooseHsv(next);
          }}
        >
          <span
            aria-hidden="true"
            style={{
              left: `${hsv.saturation * 100}%`,
              top: `${(1 - hsv.value) * 100}%`,
              backgroundColor: color,
            }}
          />
        </Button>
        <span className="sr-only" id={`${id}-plane-help`}>
          <UiText text="使用左右方向键调整饱和度，上下方向键调整明度。" />
        </span>
        <label className="ui-color-channel ui-color-hue">
          <span>
            <UiText text="色相" />
          </span>
          <RangeField
            aria-label={t("色相")}
            min={0}
            max={360}
            value={Math.round(hsv.hue)}
            disabled={disabled}
            onChange={(event) =>
              chooseHsv({ ...hsv, hue: Number(event.target.value) })
            }
          />
        </label>
        <label className="ui-color-hex">
          <span style={{ backgroundColor: color }} aria-hidden="true" />
          <span className="sr-only">
            <UiText text={hexLabel} />
          </span>
          <TextField
            aria-label={t(hexLabel)}
            value={draft ?? color}
            maxLength={7}
            disabled={disabled}
            spellCheck={false}
            aria-invalid={!valid}
            aria-describedby={!valid ? `${id}-error` : undefined}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              const valid = hexColor(next);
              if (valid) onChange(valid);
            }}
          />
        </label>
        {!valid && (
          <p id={`${id}-error`} className="form-error">
            <UiText text="请输入 # 加三位或六位十六进制颜色。" />
          </p>
        )}
        <details className="ui-color-rgb">
          <summary>
            <UiText text="RGB 通道" />
          </summary>
          {(["红", "绿", "蓝"] as const).map((label, index) => (
            <label className="ui-color-channel" key={label}>
              <span>
                {label}
                <output>{channels[index]}</output>
              </span>
              <RangeField
                aria-label={`${label}色通道`}
                min={0}
                max={255}
                value={channels[index]}
                disabled={disabled}
                onChange={(event) => {
                  const next = [...channels];
                  next[index] = Number(event.target.value);
                  choose(rgbHex(next));
                }}
              />
            </label>
          ))}
        </details>
        <Button className="ui-color-done" onClick={close}>
          <UiText text="完成" />
        </Button>
      </Popover>
    </span>
  );
}
