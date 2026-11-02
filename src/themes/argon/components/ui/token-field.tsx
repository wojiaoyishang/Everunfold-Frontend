"use client";
import { useId, useState } from "react";
import { Button, TextField } from "./primitives";
import { Icon } from "../icon";
import styles from "./token-field.module.css";
export function TokenField({
  label,
  value,
  onChange,
  suggestions = [],
  limit = 30,
  disabled = false,
  multiple = false,
  compactLabel = false,
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  limit?: number;
  disabled?: boolean;
  multiple?: boolean;
  compactLabel?: boolean;
}) {
  const id = useId();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const add = (text: string) => {
    const names = (multiple ? text.split(/[,，]/) : [text])
      .map((name) => name.trim().normalize("NFC"))
      .filter(Boolean);
    if (!names.length) return;
    const next = [
      ...new Map(
        [...value, ...names].map((name) => [name.toLocaleLowerCase(), name]),
      ).values(),
    ];
    if (names.some((name) => name.length > 60) || next.length > limit) {
      setMessage(`每项最多 60 字符，最多 ${limit} 项。`);
      return;
    }
    onChange(next);
    setInput("");
    setMessage("");
  };
  return (
    <div className={styles.field} data-compact-label={compactLabel}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.tokens}>
        {value.map((name) => (
          <span key={name}>
            {name}
            <Button
              disabled={disabled}
              aria-label={`移除${label}：${name}`}
              onClick={() => onChange(value.filter((item) => item !== name))}
            >
              <Icon name="close" />
            </Button>
          </span>
        ))}
      </div>
      <div className={styles.entry}>
        <TextField
          id={id}
          disabled={disabled}
          value={input}
          maxLength={multiple ? 1000 : 60}
          placeholder={`输入${label}名称`}
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.nativeEvent.isComposing) {
              event.preventDefault();
              add(input);
            }
          }}
        />
        <Button
          className="admin-button"
          disabled={disabled || !input.trim()}
          aria-label={`添加${label}`}
          onClick={() => add(input)}
        >
          <Icon name="plus" />
          {compactLabel && <span>添加</span>}
        </Button>
      </div>
      <div className={styles.suggestions}>
        {suggestions
          .filter((name) => !value.includes(name) && name.includes(input))
          .slice(0, 8)
          .map((name) => (
            <Button key={name} disabled={disabled} onClick={() => add(name)}>
              {name}
            </Button>
          ))}
      </div>
      {message && <small role="status">{message}</small>}
    </div>
  );
}
