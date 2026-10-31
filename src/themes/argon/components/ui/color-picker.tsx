"use client";
import { useId, useState } from "react";
import { Button, Popover, TextField } from "./primitives";
import { RangeField } from "./range-field";
import { useAnchoredPopover } from "./use-anchored-popover";

export function ColorPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const { trigger, panel, open, onToggle, close, onPanelKeyDown } =
    useAnchoredPopover(264);
  const [draft, setDraft] = useState<string | null>(null);
  const channels = [1, 3, 5].map((start) =>
    parseInt(value.slice(start, start + 2), 16),
  );
  const valid = draft === null || /^#[\da-f]{6}$/i.test(draft);
  return (
    <span className="ui-color-picker">
      <Button
        ref={trigger}
        className="ui-color-trigger"
        aria-label="自定义主题色"
        title="自定义主题色"
        aria-expanded={open}
        aria-controls={id}
        aria-haspopup="dialog"
        popoverTarget={id}
        onClick={() => setDraft(null)}
      >
        <span style={{ backgroundColor: value }} aria-hidden="true" />
        自选
      </Button>
      <Popover
        ref={panel}
        id={id}
        onToggle={onToggle}
        onKeyDown={onPanelKeyDown}
        className="ui-color-panel ui-anchored-panel"
        role="dialog"
        aria-labelledby={`${id}-title`}
      >
        <strong id={`${id}-title`}>调一杯自己的颜色</strong>
        <label className="ui-color-hex">
          <span style={{ backgroundColor: value }} aria-hidden="true" />
          <span className="sr-only">十六进制主题色</span>
          <TextField
            aria-label="十六进制主题色"
            value={draft ?? value}
            maxLength={7}
            spellCheck={false}
            aria-invalid={!valid}
            aria-describedby={!valid ? `${id}-error` : undefined}
            onChange={(event) => {
              const next = event.target.value;
              setDraft(next);
              if (/^#[\da-f]{6}$/i.test(next)) onChange(next.toLowerCase());
            }}
          />
        </label>
        {!valid && (
          <p id={`${id}-error`} className="form-error">
            请输入 # 加六位十六进制颜色。
          </p>
        )}
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
              onChange={(event) => {
                const next = [...channels];
                next[index] = Number(event.target.value);
                setDraft(null);
                onChange(
                  `#${next.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`,
                );
              }}
            />
          </label>
        ))}
        <Button className="ui-color-done" onClick={close}>
          完成
        </Button>
      </Popover>
    </span>
  );
}
