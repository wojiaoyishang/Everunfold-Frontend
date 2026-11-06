"use client";
import type {
  UserPreset,
  UserPresetStamp,
} from "@/generated/accounts-contract";
import { UiText, useT } from "@/core/i18n/provider";
import { Select } from "../../components/ui/select";
import { Button } from "../../components/ui/primitives";

const key = (preset: UserPreset) => `${preset.id}@${preset.revision}`;

export function UserPresetPicker({
  items,
  applied,
  selected,
  onSelect,
  onRefresh,
}: {
  items: UserPreset[];
  applied?: UserPresetStamp | null;
  selected: UserPreset | null | undefined;
  onSelect: (value: UserPreset | null | undefined) => void;
  onRefresh: () => void;
}) {
  const t = useT();
  const options = [
    ...(applied
      ? [
          {
            value: "current",
            label: t("保留当前身份：{name}", { name: applied.name }),
          },
        ]
      : []),
    { value: "custom", label: t("自定义权限") },
    ...items.map((row) => ({
      value: key(row),
      label: `${row.name} · v${row.revision}`,
    })),
  ];
  if (selected && !items.some((row) => key(row) === key(selected)))
    options.push({
      value: key(selected),
      label: t("已过期的选择：{name}", { name: selected.name }),
    });
  return (
    <div className="account-preset-picker">
      <div className="account-preset-select">
        <span>
          <UiText text="身份预设" />
        </span>
        <Select
          name="user-permission-preset"
          label="身份预设"
          options={options}
          value={
            selected
              ? key(selected)
              : selected === undefined && applied
                ? "current"
                : "custom"
          }
          onValueChange={(value) =>
            onSelect(
              value === "current"
                ? undefined
                : value === "custom"
                  ? null
                  : (items.find((row) => key(row) === value) ?? selected),
            )
          }
        />
      </div>
      <Button className="admin-button" onClick={onRefresh}>
        <UiText text="刷新预设" />
      </Button>
      <p className="account-policy-help">
        <UiText text="选择预设后可单独微调权限；修改预设不会自动影响已有用户。" />
      </p>
    </div>
  );
}
