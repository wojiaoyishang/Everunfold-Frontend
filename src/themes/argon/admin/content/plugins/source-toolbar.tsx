"use client";
import { useId } from "react";
import type { SourceCommand } from "@/core/editor/source-commands";
import { Icon, type IconName } from "../../../components/icon";
import { Button, Popover } from "../../../components/ui/primitives";
import { Select } from "../../../components/ui/select";
import { useAnchoredPopover } from "../../../components/ui/use-anchored-popover";
import styles from "./source-block-editor.module.css";
export interface SourceAction {
  label: string;
  icon: IconName;
  command: SourceCommand;
  hint?: string;
}
const headingOptions = [
  { value: "0", label: "正文" },
  ...Array.from({ length: 6 }, (_, i) => ({
    value: String(i + 1),
    label: `标题 ${i + 1}`,
  })),
];

export function SourceToolbar({
  label,
  disabled,
  format,
  heading,
  actions,
  inserts,
  onCommand,
  onIndent,
}: {
  label: string;
  disabled: boolean;
  format: "markdown" | "html";
  heading: number;
  actions: readonly SourceAction[];
  inserts: readonly SourceAction[];
  onCommand: (command: SourceCommand) => void;
  onIndent: (direction: -1 | 1) => void;
}) {
  const id = useId();
  const {
    trigger,
    panel,
    open,
    ready,
    close,
    onBeforeToggle,
    onToggle,
    onPanelKeyDown,
  } = useAnchoredPopover(218);

  const formatLabel = format === "markdown" ? "Markdown" : "HTML";
  return (
    <div
      className={styles.tools}
      role="group"
      aria-label={formatLabel + " 工具栏"}
    >
      <Select
        name={id + "-heading"}
        label={label + " 段落样式"}
        options={headingOptions}
        value={String(heading)}
        disabled={disabled}
        onValueChange={(level) =>
          onCommand({
            kind: "heading",
            level: Number(level),
            format,
          })
        }
      />
      <div className={styles.toolGroup}>
        {actions.map((action) => (
          <Button
            key={action.label}
            className={styles.tool}
            disabled={disabled}
            title={action.label + (action.hint ? " (" + action.hint + ")" : "")}
            aria-label={action.label}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onCommand(action.command)}
          >
            <Icon name={action.icon} />
          </Button>
        ))}
      </div>
      <Button
        className={styles.insertTrigger}
        ref={trigger}
        popoverTarget={id + "-insert"}
        aria-expanded={open}
        aria-label={formatLabel + " 插入工具"}
        disabled={disabled || !ready}
      >
        <Icon name="plus" /> 插入 <Icon name="chevron" />
      </Button>
      <Popover
        id={id + "-insert"}
        ref={panel}
        className={"ui-anchored-panel " + styles.insertMenu}
        aria-label={formatLabel + " 插入选项"}
        onBeforeToggle={onBeforeToggle}
        onToggle={onToggle}
        onKeyDown={onPanelKeyDown}
      >
        {inserts.map((action) => (
          <Button
            key={action.label}
            disabled={disabled}
            onClick={() => {
              close();
              onCommand(action.command);
            }}
          >
            <Icon name={action.icon} />
            {action.label}
          </Button>
        ))}
        <div className={styles.menuDivider} />
        <Button
          disabled={disabled}
          onClick={() => {
            close();
            onIndent(1);
          }}
        >
          <Icon name="indent-more" />
          增加缩进
        </Button>
        <Button
          disabled={disabled}
          onClick={() => {
            close();
            onIndent(-1);
          }}
        >
          <Icon name="indent-less" />
          减少缩进
        </Button>
      </Popover>
    </div>
  );
}
