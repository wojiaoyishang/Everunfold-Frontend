"use client";
import type { FormFieldProps } from "@everunfold/plugin-sdk";
import { ExtensionComponent, useLocale } from "@everunfold/plugin-sdk/client";
import { honorsText } from "./labels";
import styles from "./styles.module.css";

export function HonorField(props: FormFieldProps) {
  const { uiLocale } = useLocale();
  const t = (text: string) => honorsText(text, uiLocale);
  const { field } = props;
  const control =
    typeof field.props?.control === "string"
      ? field.props.control
      : "form.text";
  const settings = { ...field.props };
  for (const key of ["addLabel", "itemLabel", "emptyText"])
    if (typeof settings[key] === "string") settings[key] = t(settings[key]);
  if (Array.isArray(settings.choices))
    settings.choices = settings.choices.map((choice: unknown) => {
      if (
        !choice ||
        typeof choice !== "object" ||
        !("label" in choice) ||
        typeof choice.label !== "string"
      )
        return choice;
      return { ...choice, label: t(choice.label) };
    });
  return (
    <div
      className={
        control === "form.list" || control === "form.textarea"
          ? styles.wideField
          : undefined
      }
    >
      <ExtensionComponent
        name={control}
        {...props}
        field={{
          ...field,
          label: t(field.label),
          component: control,
          props: settings,
        }}
      />
      {field.key === "date" && (
        <small>{t("日期示例：2025.06 或 2025.06.18，未知时间可留空。")}</small>
      )}
    </div>
  );
}
