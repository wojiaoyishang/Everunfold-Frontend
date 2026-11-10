"use client";
import { useT } from "@/core/i18n/provider";
import { UiText } from "@/core/i18n/provider";

import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Icon } from "../icon";
import { Button, Popover } from "./primitives";
import { matchOption, moveOption, type SelectOption } from "./select-model";
import { useAnchoredPopover } from "./use-anchored-popover";

export function Select({
  name,
  label: sourceLabel,
  options: sourceOptions,
  defaultValue,
  value,
  onValueChange,
  disabled = false,
  className,
  programOptions = false,
  id: providedId,
  "aria-describedby": describedBy,
}: {
  name: string;
  label: string;
  options: readonly SelectOption[];
  defaultValue?: string;
  value?: string;
  onValueChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  programOptions?: boolean;
  id?: string;
  "aria-describedby"?: string;
}) {
  const t = useT();
  const label = t(sourceLabel);
  const options = programOptions
    ? sourceOptions.map((item) => ({ ...item, label: t(item.label) }))
    : sourceOptions;
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const {
    trigger,
    panel,
    open,
    ready: hydrated,
    onBeforeToggle,
    onToggle,
    onPanelKeyDown,
  } = useAnchoredPopover();
  const [local, setLocal] = useState(
    defaultValue ?? options.find((item) => !item.disabled)?.value ?? "",
  );
  const selected = value ?? local;
  const [active, setActive] = useState(-1);
  const typeahead = useRef({ text: "", at: 0 });
  const selectedIndex = options.findIndex((item) => item.value === selected);
  useLayoutEffect(() => {
    if (!open || active < 0 || !panel.current) return;
    const option = panel.current.children[active] as HTMLElement | undefined;
    if (!option) return;
    // Only scroll this list: scrollIntoView could move the surrounding article/dialog.
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < panel.current.scrollTop)
      panel.current.scrollTo({ top, behavior: "instant" });
    else if (bottom > panel.current.scrollTop + panel.current.clientHeight)
      panel.current.scrollTo({
        top: bottom - panel.current.clientHeight,
        behavior: "instant",
      });
  }, [active, open, panel]);
  const choose = (index: number) => {
    const option = options[index];
    if (!option || option.disabled) return;
    if (value === undefined) setLocal(option.value);
    onValueChange?.(option.value);
    panel.current?.hidePopover();
    trigger.current?.focus({ preventScroll: true });
  };
  function keyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "Escape" && open) {
      event.preventDefault();
      event.stopPropagation();
      panel.current?.hidePopover();
      return;
    }
    if (event.key === "Tab") {
      panel.current?.hidePopover();
      return;
    }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) panel.current?.showPopover();
      const start =
        event.key === "Home"
          ? -1
          : event.key === "End"
            ? 0
            : open
              ? active
              : selectedIndex;
      setActive(
        moveOption(
          options,
          start,
          event.key === "ArrowUp" || event.key === "End" ? -1 : 1,
        ),
      );
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (open) choose(active);
      else {
        setActive(selectedIndex);
        panel.current?.showPopover();
      }
    } else if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault();
      const now = Date.now();
      const text =
        now - typeahead.current.at < 700
          ? typeahead.current.text + event.key
          : event.key;
      typeahead.current = { text, at: now };
      const index = matchOption(options, text, active);
      if (!open) panel.current?.showPopover();
      setActive(index);
    }
  }
  return (
    <div className={className ? `ui-select ${className}` : "ui-select"}>
      <input
        type="hidden"
        name={hydrated ? name : undefined}
        value={selected}
        disabled={disabled}
      />
      <Button
        id={id}
        ref={trigger}
        className="ui-select-trigger"
        role="combobox"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-options`}
        aria-describedby={describedBy}
        aria-activedescendant={
          open && active >= 0 ? `${id}-option-${active}` : undefined
        }
        disabled={disabled || !hydrated}
        popoverTarget={`${id}-options`}
        onClick={() => setActive(selectedIndex)}
        onKeyDown={keyDown}
      >
        <span>
          {options[selectedIndex]?.flag && (
            <span className="ui-language-flag" aria-hidden="true">
              {options[selectedIndex].flag}
            </span>
          )}
          {options[selectedIndex]?.label ?? <UiText text="请选择" />}
        </span>
        <Icon name="chevron" />
      </Button>
      <Popover
        id={`${id}-options`}
        ref={panel}
        onToggle={onToggle}
        onBeforeToggle={onBeforeToggle}
        onKeyDown={onPanelKeyDown}
        className="ui-select-options ui-anchored-panel"
        role="listbox"
        aria-label={label}
      >
        {options.map((option, index) => (
          <Button
            key={option.value}
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={selected === option.value}
            aria-disabled={option.disabled || undefined}
            disabled={option.disabled}
            tabIndex={-1}
            data-highlighted={active === index}
            onPointerMove={() => {
              if (!option.disabled) setActive(index);
            }}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(index)}
          >
            <span>
              {option.flag && (
                <span className="ui-language-flag" aria-hidden="true">
                  {option.flag}
                </span>
              )}
              {option.label}
            </span>
            {selected === option.value && <Icon name="check" />}
          </Button>
        ))}
      </Popover>
      <noscript>
        <fieldset className="ui-select-noscript">
          <legend>{label}</legend>
          {options.map((option) => (
            <label key={option.value}>
              <input
                type="radio"
                name={name}
                value={option.value}
                defaultChecked={selected === option.value}
                disabled={disabled || option.disabled}
              />
              {option.label}
            </label>
          ))}
        </fieldset>
      </noscript>
    </div>
  );
}
