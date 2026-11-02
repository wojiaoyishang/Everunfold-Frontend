"use client";
import { useId, useState } from "react";
import {
  calendarDays,
  dateLabel,
  dateValue,
  localInstant,
  sameDay,
} from "@/core/date-time";
import { Button, Popover } from "./primitives";
import { Select } from "./select";
import { useAnchoredPopover } from "./use-anchored-popover";
import { Icon } from "../icon";
import styles from "./date-time-field.module.css";

export function DateTimeField({
  label,
  value,
  onValueChange,
  disabled = false,
  placeholder = "选择日期与时间",
}: {
  label: string;
  value?: string | null;
  onValueChange: (value: string | null) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const id = useId();
  const {
    trigger,
    panel,
    open,
    ready,
    close,
    onToggle,
    onBeforeToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(304, true);
  const [day, setDay] = useState(() => new Date(2000, 0, 1));
  const [month, setMonth] = useState(() => new Date(2000, 0, 1));
  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [today, setToday] = useState(() => new Date(2000, 0, 1));
  const initialize = (date: Date) => {
    setDay(date);
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    setHour(date.getHours());
    setMinute(date.getMinutes());
  };
  const years = Array.from({ length: 201 }, (_, i) => ({
    value: String(1900 + i),
    label: `${1900 + i} 年`,
  }));
  const focusDay = (next: Date) => {
    if (next.getFullYear() < 1900 || next.getFullYear() > 2100) return;
    setDay(next);
    setMonth(new Date(next.getFullYear(), next.getMonth(), 1));
    requestAnimationFrame(() =>
      panel.current
        ?.querySelector<HTMLButtonElement>(
          `[data-day="${next.getFullYear()}-${next.getMonth()}-${next.getDate()}"]`,
        )
        ?.focus(),
    );
  };
  const days = calendarDays(month.getFullYear(), month.getMonth());
  const focusDate = days.some((date) => sameDay(day, date)) ? day : month;
  return (
    <span className={styles.field}>
      <Button
        ref={trigger}
        className={styles.trigger}
        popoverTarget={`${id}-calendar`}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled || !ready}
        onClick={() => {
          initialize(dateValue(value) ?? new Date());
          setToday(new Date());
        }}
      >
        <Icon name="calendar" />
        <span data-empty={!value}>
          {value && ready ? dateLabel(value) : placeholder}
        </span>
        <Icon name="chevron" />
      </Button>
      <Popover
        id={`${id}-calendar`}
        ref={panel}
        role="dialog"
        aria-label={`${label}选择器`}
        className={`ui-anchored-panel ${styles.calendar}`}
        onToggle={onToggle}
        onBeforeToggle={onBeforeToggle}
        onKeyDown={onPanelKeyDown}
      >
        <header className={styles.heading}>
          <strong>{label}</strong>
          <Button aria-label="关闭日期选择器" onClick={close}>
            <Icon name="close" />
          </Button>
        </header>
        <div className={styles.navigation}>
          <Button
            disabled={
              disabled ||
              (month.getFullYear() <= 1900 && month.getMonth() === 0)
            }
            aria-label="上个月"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))
            }
          >
            <Icon name="chevron-left" />
          </Button>
          <Select
            name={`${id}-year`}
            label="选择年份"
            value={String(month.getFullYear())}
            disabled={disabled}
            options={years}
            onValueChange={(year) =>
              setMonth(new Date(Number(year), month.getMonth(), 1))
            }
          />
          <Select
            name={`${id}-month`}
            label="选择月份"
            value={String(month.getMonth())}
            disabled={disabled}
            options={Array.from({ length: 12 }, (_, i) => ({
              value: String(i),
              label: `${i + 1} 月`,
            }))}
            onValueChange={(m) =>
              setMonth(new Date(month.getFullYear(), Number(m), 1))
            }
          />
          <Button
            disabled={
              disabled ||
              (month.getFullYear() >= 2100 && month.getMonth() === 11)
            }
            aria-label="下个月"
            onClick={() =>
              setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))
            }
          >
            <Icon name="chevron" />
          </Button>
        </div>
        <div className={styles.weekdays} aria-hidden="true">
          {["一", "二", "三", "四", "五", "六", "日"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
        <div
          className={styles.days}
          role="group"
          aria-label="选择日期"
          onKeyDown={(event) => {
            const offsets: Record<string, number> = {
              ArrowLeft: -1,
              ArrowRight: 1,
              ArrowUp: -7,
              ArrowDown: 7,
            };
            if (event.key in offsets) {
              event.preventDefault();
              focusDay(
                new Date(
                  focusDate.getFullYear(),
                  focusDate.getMonth(),
                  focusDate.getDate() + offsets[event.key],
                ),
              );
            }
            if (event.key === "PageUp" || event.key === "PageDown") {
              event.preventDefault();
              focusDay(
                new Date(
                  focusDate.getFullYear(),
                  focusDate.getMonth() + (event.key === "PageUp" ? -1 : 1),
                  1,
                ),
              );
            }
          }}
        >
          {days.map((date) => (
            <Button
              key={date.getTime()}
              aria-label={`${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`}
              aria-pressed={sameDay(day, date)}
              aria-current={sameDay(today, date) ? "date" : undefined}
              data-outside={date.getMonth() !== month.getMonth()}
              data-day={`${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`}
              tabIndex={sameDay(focusDate, date) ? 0 : -1}
              disabled={
                disabled ||
                date.getFullYear() < 1900 ||
                date.getFullYear() > 2100
              }
              onClick={() => {
                setDay(date);
                if (date.getMonth() !== month.getMonth())
                  setMonth(new Date(date.getFullYear(), date.getMonth(), 1));
              }}
            >
              {date.getDate()}
            </Button>
          ))}
        </div>
        <div className={styles.time}>
          <Icon name="clock" />
          <span>时间</span>
          <Select
            name={`${id}-hour`}
            label="小时"
            value={String(hour)}
            disabled={disabled}
            options={Array.from({ length: 24 }, (_, i) => ({
              value: String(i),
              label: String(i).padStart(2, "0"),
            }))}
            onValueChange={(v) => setHour(Number(v))}
          />
          <span>:</span>
          <Select
            name={`${id}-minute`}
            label="分钟"
            value={String(minute)}
            disabled={disabled}
            options={Array.from({ length: 60 }, (_, i) => ({
              value: String(i),
              label: String(i).padStart(2, "0"),
            }))}
            onValueChange={(v) => setMinute(Number(v))}
          />
        </div>
        <footer className={styles.footer}>
          <Button disabled={disabled} onClick={() => initialize(new Date())}>
            现在
          </Button>
          <Button
            disabled={disabled}
            onClick={() => {
              onValueChange(null);
              close();
            }}
          >
            清空
          </Button>
          <Button
            disabled={disabled}
            className={styles.confirm}
            onClick={() => {
              onValueChange(localInstant(day, hour, minute));
              close();
            }}
          >
            确定
          </Button>
        </footer>
      </Popover>
    </span>
  );
}
