"use client";

import { UiText, useT } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import styles from "./editor-mode-field.module.css";

const blockModes = [
  { value: "blocks", label: "区块模式" },
  { value: "components", label: "组件模式" },
];

export function EditorModeField({
  name = "content-edit-mode",
  value,
  modes = blockModes,
  onChange,
  disabled,
  className,
  compact,
}: {
  name?: string;
  value: string;
  modes?: { value: string; label: string }[];
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
}) {
  const t = useT();
  return (
    <label className={className ?? styles.field}>
      <UiText text="编辑方式" />
      <Select
        name={name}
        label={t("编辑方式")}
        panelMinWidth={compact ? 0 : undefined}
        value={value}
        disabled={disabled}
        options={modes.map((item) => ({ ...item, label: t(item.label) }))}
        onValueChange={(next) => {
          if (next !== value) onChange?.(next);
        }}
      />
    </label>
  );
}
