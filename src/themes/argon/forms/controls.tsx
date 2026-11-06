"use client";
import type { FormFieldProps, SettingsValues } from "@/core/forms/renderer";
import { UiText, useT } from "@/core/i18n/provider";
import { Button } from "../components/ui/primitives";
import { Switch } from "../components/ui/switch";
import { Select } from "../components/ui/select";
import { ConfirmPopover } from "../components/ui/confirm-popover";
import { AccountField } from "../account/fields";
import { Icon } from "../components/icon";
import styles from "./forms.module.css";

const record = (value: unknown): SettingsValues =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as SettingsValues)
    : {};
const num = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;
const text = (value: unknown, fallback = "") =>
  typeof value === "string" ? value : fallback;

export function TextControl({
  field,
  value,
  onChange,
  disabled,
}: FormFieldProps) {
  return (
    <AccountField
      label={field.label}
      value={text(value)}
      onChange={onChange}
      disabled={disabled}
      multiline={field.component === "form.textarea"}
      maxLength={num(field.props?.maxLength)}
      minLength={num(field.props?.minLength)}
      required={field.props?.required === true}
    />
  );
}
export function NumberControl({
  field,
  value,
  onChange,
  disabled,
}: FormFieldProps) {
  return (
    <AccountField
      label={field.label}
      type="number"
      value={typeof value === "number" ? String(value) : ""}
      onChange={(next) => onChange(next === "" ? null : Number(next))}
      disabled={disabled}
      min={num(field.props?.min)}
      max={num(field.props?.max)}
    />
  );
}
export function BooleanControl({
  field,
  value,
  onChange,
  disabled,
}: FormFieldProps) {
  const t = useT();
  return (
    <div className={styles.toggle}>
      <span>{t(field.label)}</span>
      <Switch
        aria-label={t(field.label)}
        checked={value === true}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}
export function SelectControl({ field, value, onChange }: FormFieldProps) {
  const t = useT();
  const choices = (
    Array.isArray(field.props?.choices) ? field.props.choices : []
  ).flatMap((item: unknown) => {
    if (typeof item === "string") return [{ value: item, label: t(item) }];
    const choice = record(item);
    return typeof choice.value === "string"
      ? [{ value: choice.value, label: t(text(choice.label, choice.value)) }]
      : [];
  });
  return (
    <div className="account-field">
      <span>{t(field.label)}</span>
      <Select
        label={t(field.label)}
        name={field.key}
        value={text(value)}
        options={choices}
        onValueChange={onChange}
      />
    </div>
  );
}
export function ObjectControl({
  field,
  value,
  onChange,
  renderFields,
}: FormFieldProps) {
  return (
    <section className={styles.object}>
      <h3>
        <UiText text={field.label} />
      </h3>
      {renderFields(field.fields ?? [], record(value), onChange)}
    </section>
  );
}
export function ListControl({
  field,
  value,
  onChange,
  renderFields,
  disabled,
}: FormFieldProps) {
  const t = useT();
  const rows = Array.isArray(value) ? value : [];
  const move = (index: number, offset: number) => {
    const next = [...rows];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onChange(next);
  };
  return (
    <section className={styles.list}>
      <header>
        <h3>
          {t(field.label)} <small>{rows.length}</small>
        </h3>
        <Button
          className="admin-button"
          disabled={
            disabled || rows.length >= (num(field.props?.maxItems) ?? 1000)
          }
          onClick={() =>
            onChange([
              ...rows,
              Object.fromEntries(
                (field.fields ?? []).map((child) => [
                  child.key,
                  structuredClone(child.default ?? ""),
                ]),
              ),
            ])
          }
        >
          <UiText text={text(field.props?.addLabel, "添加条目")} />
        </Button>
      </header>
      {!rows.length && typeof field.props?.emptyText === "string" && (
        <p>{t(field.props.emptyText)}</p>
      )}
      {rows.map((row, index) => (
        <section className={styles.item} key={index}>
          <header>
            <strong>
              {text(
                record(row).name,
                text(
                  record(row).title,
                  `${t(text(field.props?.itemLabel, "条目"))} ${index + 1}`,
                ),
              )}
            </strong>
            <div>
              <Button
                className="admin-button"
                aria-label={t("上移条目")}
                disabled={disabled || index === 0}
                onClick={() => move(index, -1)}
              >
                <Icon name="chevron-up" />
              </Button>
              <Button
                className="admin-button"
                aria-label={t("下移条目")}
                disabled={disabled || index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                <Icon name="chevron-down" />
              </Button>
              <ConfirmPopover
                label={t("移除条目")}
                title="移除此条目？"
                description="保存页面后才会生效。"
                triggerClassName="admin-button"
                onConfirmed={() =>
                  onChange(rows.filter((_, position) => position !== index))
                }
              >
                <UiText text="移除" />
              </ConfirmPopover>
            </div>
          </header>
          {renderFields(field.fields ?? [], record(row), (next) =>
            onChange(rows.map((item, at) => (at === index ? next : item))),
          )}
        </section>
      ))}
    </section>
  );
}
