"use client";

import { useId, useRef, useState, type ReactNode } from "react";
import { UiText, useT } from "@/core/i18n/provider";
import { Icon } from "../../components/icon";
import { Button, TextField } from "../../components/ui/primitives";
import styles from "./permalink-field.module.css";

export function PermalinkField({
  value,
  onChange,
  disabled,
  displayValue = value,
  emptyLabel = "填写标题后自动生成",
  placeholder = "/自定义路径.html",
  maxLength = 500,
  error,
  validate,
  after,
}: {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  displayValue?: string;
  emptyLabel?: string;
  placeholder?: string;
  maxLength?: number;
  error?: string;
  validate?: (value: string) => string;
  after?: ReactNode;
}) {
  const t = useT();
  const errorId = useId();
  const editButton = useRef<HTMLButtonElement>(null);
  const [input, setInput] = useState<string | null>(null);
  const [inputError, setInputError] = useState("");
  const message =
    inputError ||
    (input === null || input.trim() === value ? error : undefined);
  const label = t("编辑固定链接");

  const close = () => {
    setInput(null);
    setInputError("");
    requestAnimationFrame(() => editButton.current?.focus());
  };
  const apply = () => {
    if (input === null) return;
    const path = input.trim();
    const validation = validate?.(path);
    if (validation) {
      setInputError(validation);
      return;
    }
    onChange(path);
    close();
  };

  return (
    <div className={styles.line}>
      <span>
        <UiText text="固定链接：" />
      </span>
      {input === null ? (
        <>
          <span className={styles.value}>
            {displayValue || <UiText text={emptyLabel} />}
          </span>
          <Button
            ref={editButton}
            className={styles.action}
            aria-label={label}
            aria-describedby={message ? errorId : undefined}
            disabled={disabled}
            onClick={() => setInput(value)}
          >
            <Icon name="edit" /> <UiText text="编辑" />
          </Button>
          {after}
        </>
      ) : (
        <div className={styles.edit}>
          <TextField
            autoFocus
            className={styles.input}
            aria-label={label}
            aria-invalid={Boolean(message) || undefined}
            aria-describedby={message ? errorId : undefined}
            data-editor-local-control
            value={input}
            maxLength={maxLength}
            disabled={disabled}
            placeholder={value || t(placeholder)}
            onChange={(event) => {
              setInput(event.target.value);
              setInputError("");
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing || event.keyCode === 229)
                return;
              if (event.key === "Enter" || event.key === "Escape") {
                event.preventDefault();
                if (event.key === "Enter") apply();
                else close();
              }
            }}
          />
          <Button className={styles.action} disabled={disabled} onClick={apply}>
            <UiText text="确定" />
          </Button>
          <Button className={styles.action} onClick={close}>
            <UiText text="取消" />
          </Button>
        </div>
      )}
      {message && (
        <small className={styles.error} id={errorId} role="alert">
          <UiText text={message} />
        </small>
      )}
    </div>
  );
}
