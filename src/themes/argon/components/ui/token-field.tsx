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
}: {
  label: string;
  value: string[];
  onChange: (value: string[]) => void;
  suggestions?: string[];
  limit?: number;
  disabled?: boolean;
}) {
  const id = useId();
  const [input, setInput] = useState("");
  const [message, setMessage] = useState("");
  const add = (text: string) => {
    const name = text.trim().normalize("NFC");
    if (!name) return;
    if (
      value.some(
        (item) => item.toLocaleLowerCase() === name.toLocaleLowerCase(),
      )
    ) {
      setMessage("已经添加了这个名称。");
      return;
    }
    if (name.length > 60 || value.length >= limit) {
      setMessage(`每项最多 60 字符，最多 ${limit} 项。`);
      return;
    }
    onChange([...value, name]);
    setInput("");
    setMessage("");
  };
  return (
    <div className={styles.field}>
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
          maxLength={60}
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
