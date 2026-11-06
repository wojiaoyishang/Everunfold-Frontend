"use client";
import { useId } from "react";
import type { PermissionDefinition } from "@/core/contracts/accounts";
import { UiText, useT } from "@/core/i18n/provider";
import { Checkbox } from "../components/ui/checkbox";
import { Select } from "../components/ui/select";

export type PermissionValues = Record<string, "own" | "all">;
export function PermissionPicker({
  definitions,
  ceiling,
  value,
  onChange,
  disabled = false,
  programLabels = true,
}: {
  definitions: PermissionDefinition[];
  ceiling: PermissionValues;
  value: PermissionValues;
  onChange: (value: PermissionValues) => void;
  disabled?: boolean;
  programLabels?: boolean;
}) {
  const id = useId();
  const t = useT();
  return (
    <div className="account-permissions">
      {definitions
        .filter((item) => ceiling[item.code])
        .map((item, index) => {
          const checked = !!value[item.code];
          return (
            <div className="account-permission-row" key={item.code}>
              <label htmlFor={id + index}>
                <Checkbox
                  id={id + index}
                  checked={checked}
                  disabled={disabled}
                  onChange={(event) => {
                    const next = { ...value };
                    if (event.target.checked)
                      next[item.code] = ceiling[item.code];
                    else delete next[item.code];
                    onChange(next);
                  }}
                />
                <span>
                  <strong>
                    {programLabels ? <UiText text={item.label} /> : item.label}
                  </strong>
                  <small>{item.code}</small>
                </span>
              </label>
              {item.owner_scope ? (
                <Select
                  name={id + item.code}
                  label={t("授权范围：{name}", {
                    name: programLabels ? t(item.label) : item.label,
                  })}
                  value={value[item.code] ?? ceiling[item.code]}
                  disabled={!checked || disabled}
                  programOptions
                  options={
                    ceiling[item.code] === "all"
                      ? [
                          { value: "own", label: "仅本人" },
                          { value: "all", label: "全部" },
                        ]
                      : [{ value: "own", label: "仅本人" }]
                  }
                  onValueChange={(scope) =>
                    onChange({ ...value, [item.code]: scope as "own" | "all" })
                  }
                />
              ) : (
                <small>
                  <UiText text="全局范围" />
                </small>
              )}
            </div>
          );
        })}
    </div>
  );
}
