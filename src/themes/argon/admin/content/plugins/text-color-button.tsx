"use client";
import { UiText } from "@/core/i18n/provider";

import { useState } from "react";
import { ActionPopover } from "../../../components/ui/action-popover";
import { Button, Form, TextField } from "../../../components/ui/primitives";
import { Icon } from "../../../components/icon";
import styles from "./rich-editor.module.css";

export function TextColorButton({
  value = "",
  disabled,
  className,
  allowReset = true,
  onApply,
}: {
  value?: string;
  disabled?: boolean;
  className?: string;
  allowReset?: boolean;
  onApply: (color: string | null) => void;
}) {
  return (
    <ActionPopover
      label="文字颜色"
      disabled={disabled}
      className={className}
      panelWidth={280}
      triggerContent={
        <span
          className={styles.colorIcon}
          style={value ? { color: value } : undefined}
        >
          <Icon name="type" />
        </span>
      }
    >
      {(close) => (
        <ColorForm
          key={value}
          value={value}
          allowReset={allowReset}
          apply={(color) => {
            onApply(color);
            close();
          }}
        />
      )}
    </ActionPopover>
  );
}
function ColorForm({
  value,
  allowReset,
  apply,
}: {
  value: string;
  allowReset: boolean;
  apply: (color: string | null) => void;
}) {
  const [color, setColor] = useState(value || "#333333");
  const valid = /^#[\da-f]{6}$/i.test(color);
  return (
    <Form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        if (valid) apply(color.toLowerCase());
      }}
    >
      <label>
        <UiText text="文字颜色" />
        <TextField
          aria-label="文字颜色值"
          value={color}
          maxLength={7}
          spellCheck={false}
          aria-invalid={!valid}
          onChange={(event) => setColor(event.target.value)}
        />
      </label>
      <div
        className={styles.colorSwatches}
        role="group"
        aria-label="常用文字颜色"
      >
        {[
          ["红色", "#c0392b"],
          ["橙色", "#b85c00"],
          ["绿色", "#237a45"],
          ["蓝色", "#2457c5"],
          ["紫色", "#8040a0"],
          ["黑色", "#222222"],
          ["白色", "#ffffff"],
        ].map(([label, hex]) => (
          <Button
            key={hex}
            title={label}
            aria-label={label}
            aria-pressed={color.toLowerCase() === hex}
            onClick={() => setColor(hex)}
          >
            <span style={{ background: hex }} />
          </Button>
        ))}
      </div>
      {!valid && (
        <p role="alert">
          <UiText text="请输入 # 加六位十六进制颜色。" />
        </p>
      )}
      <div>
        {allowReset && (
          <Button className="admin-button" onClick={() => apply(null)}>
            <UiText text="默认颜色" />
          </Button>
        )}
        <Button
          type="submit"
          className="admin-button admin-button-primary"
          disabled={!valid}
        >
          <UiText text="应用颜色" />
        </Button>
      </div>
    </Form>
  );
}
