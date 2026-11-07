"use client";
import { useId, useState } from "react";
import type { FormFieldProps } from "@everunfold/plugin-sdk";
import {
  Button,
  TextField,
  Icon,
  MediaPickerDialog,
  useLocale,
} from "@everunfold/plugin-sdk/client";
import { honorsText } from "./labels";
import styles from "./styles.module.css";

export function HonorImageField({
  field,
  value,
  onChange,
  disabled,
}: FormFieldProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const { uiLocale } = useLocale();
  const t = (text: string) => honorsText(text, uiLocale);
  return (
    <div className="account-field">
      <label htmlFor={id}>{t(field.label)}</label>
      <div className={styles.imageField}>
        <TextField
          id={id}
          value={typeof value === "string" ? value : ""}
          inputMode="url"
          placeholder={t("图片地址")}
          maxLength={2048}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        />
        <Button
          className="admin-button"
          onClick={() => setOpen(true)}
          disabled={disabled}
        >
          <Icon name="image" />
          {t("媒体库")}
        </Button>
      </div>
      {open && (
        <MediaPickerDialog
          title={t("选择证书图片")}
          kind="image"
          onClose={() => setOpen(false)}
          onPick={(item) => onChange(item.url)}
        />
      )}
    </div>
  );
}
