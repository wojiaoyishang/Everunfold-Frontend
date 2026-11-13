import { UiText, useT } from "@/core/i18n/provider";
import { useId } from "react";
import type { ShortcodeParameter } from "@/core/contracts/settings";
import { Button, TextField } from "../../components/ui/primitives";
import { Select } from "../../components/ui/select";
import { Checkbox } from "../../components/ui/checkbox";
import { ConfirmPopover } from "../../components/ui/confirm-popover";
import { Icon } from "../../components/icon";
import styles from "./shortcodes.module.css";

export function ShortcodeParameters({
  value,
  onChange,
  disabled,
}: {
  value: ShortcodeParameter[];
  onChange: (parameters: ShortcodeParameter[]) => void;
  disabled: boolean;
}) {
  const id = useId();
  const update = (index: number, patch: Partial<ShortcodeParameter>) =>
    onChange(
      value.map((item, at) => (at === index ? { ...item, ...patch } : item)),
    );
  return (
    <div className={styles.parameters}>
      <p className={styles.hint}>
        <UiText text="模板用" />
        {<UiText text="{{ 参数名 }}" />} <UiText text="插入文字，容器正文用" />
        {"{{ content }}"}
        <UiText text="。链接的 href 插槽使用 URL 参数。" />
      </p>
      {value.map((parameter, index) => (
        <section
          className={styles.parameter}
          key={index}
          aria-label={`参数 ${index + 1}`}
        >
          <div className={styles.parameterHeading}>
            <strong>
              <UiText text="参数" />
              {index + 1}
            </strong>
            {!disabled && (
              <ConfirmPopover
                label={`移除参数 ${index + 1}`}
                title="移除这个参数？"
                description="此操作修改当前草稿。请同时调整模板中的插槽。"
                onConfirmed={() =>
                  onChange(value.filter((_, at) => at !== index))
                }
              >
                <Icon name="trash" />
              </ConfirmPopover>
            )}
          </div>
          <div className={styles.fields}>
            <label className={styles.field}>
              <span>
                <UiText text="参数名" />
              </span>
              <TextField
                value={parameter.name}
                disabled={disabled}
                maxLength={32}
                onChange={(event) =>
                  update(index, { name: event.target.value })
                }
              />
            </label>
            <label className={styles.field}>
              <span>
                <UiText text="显示名称" />
              </span>
              <TextField
                value={parameter.label}
                disabled={disabled}
                maxLength={60}
                onChange={(event) =>
                  update(index, { label: event.target.value })
                }
              />
            </label>
            <div className={styles.field}>
              <label htmlFor={`${id}-type-${index}`}>
                <UiText text="参数类型" />
              </label>
              <Select
                programOptions
                id={`${id}-type-${index}`}
                name={`parameter-${index}-type`}
                label="参数类型"
                value={parameter.type ?? "text"}
                disabled={disabled}
                options={[
                  { value: "text", label: "文字" },
                  { value: "url", label: "链接" },
                  { value: "select", label: "选项" },
                  { value: "number", label: "数字" },
                  { value: "boolean", label: "布尔值" },
                ]}
                onValueChange={(type) =>
                  update(index, {
                    type: type as ShortcodeParameter["type"],
                    options: type === "select" ? ["选项一", "选项二"] : [],
                    default:
                      type === "select"
                        ? "选项一"
                        : type === "boolean"
                          ? "true"
                          : type === "number"
                            ? "0"
                            : "",
                  })
                }
              />
            </div>
            <label className={styles.field}>
              <span>
                <UiText text="默认值" />
              </span>
              <TextField
                value={parameter.default ?? ""}
                disabled={disabled}
                maxLength={1000}
                onChange={(event) =>
                  update(index, { default: event.target.value })
                }
              />
            </label>
            {parameter.type === "select" && (
              <label className={styles.field}>
                <span>
                  <UiText text="选项（用 | 分隔）" />
                </span>
                <TextField
                  value={(parameter.options ?? []).join("|")}
                  disabled={disabled}
                  onChange={(event) =>
                    update(index, { options: event.target.value.split("|") })
                  }
                />
              </label>
            )}
          </div>
          <label className={styles.actions}>
            <Checkbox
              checked={parameter.required ?? false}
              disabled={disabled}
              onChange={(event) =>
                update(index, { required: event.target.checked })
              }
            />
            <UiText text="必填" />
          </label>
        </section>
      ))}
      {!disabled && (
        <Button
          className="admin-button"
          disabled={value.length >= 16}
          onClick={() =>
            onChange([
              ...value,
              {
                name: `param${value.length + 1}`,
                label: "新参数",
                type: "text",
                default: "",
                required: false,
                options: [],
              },
            ])
          }
        >
          <Icon name="plus" />
          <UiText text="添加参数" />
        </Button>
      )}
    </div>
  );
}

export function ShortcodeValues({
  parameters,
  values,
  onChange,
}: {
  parameters: ShortcodeParameter[];
  values: Record<string, string>;
  onChange: (values: Record<string, string>) => void;
}) {
  const id = useId();
  const t = useT();
  if (!parameters.length) return null;
  return (
    <div className={styles.fields}>
      {parameters.map((parameter) => {
        const fieldId = `${id}-${parameter.name}`;
        const label = parameter.label || parameter.name;
        const choice =
          parameter.type === "select" || parameter.type === "boolean";
        const value = values[parameter.name] ?? parameter.default ?? "";
        const setValue = (next: string) =>
          onChange({ ...values, [parameter.name]: next });
        return (
          <div className={styles.field} key={parameter.name}>
            <label
              htmlFor={fieldId}
              data-required={choice && parameter.required}
            >
              {t(label)}
            </label>
            {choice ? (
              <Select
                id={fieldId}
                name={fieldId}
                label={label}
                aria-required={parameter.required}
                value={value}
                options={(parameter.type === "boolean"
                  ? ["true", "false"]
                  : (parameter.options ?? [])
                ).map((value) => ({ value, label: value }))}
                onValueChange={setValue}
              />
            ) : (
              <TextField
                id={fieldId}
                required={parameter.required}
                value={value}
                maxLength={1000}
                onChange={(event) => setValue(event.target.value)}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
